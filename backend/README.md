# Calling-Agents Backend — Architecture

Django backend for an **AI outbound-calling CRM**: it stores leads, organizes them into campaigns, places real phone calls through **Exotel**, lets an **OpenAI Realtime** voice agent hold the conversation, records live transcripts, classifies each call's outcome with GPT, and streams everything to a React dashboard over WebSockets.

---

## 1. Tech stack

| Layer | Technology | Why |
|---|---|---|
| Web framework | Django 5.2 + Django REST Framework | REST API, ORM, admin |
| Async server | Daphne (ASGI) via `channels[daphne]` | Serves HTTP **and** WebSockets in one process |
| WebSockets | Django Channels 4 | Live dashboard feed + Exotel audio streaming |
| Channel layer | Redis (`channels_redis`) or in-memory | Fan-out of live events between consumers |
| Auth | `djangorestframework-simplejwt` | Stateless JWT (Bearer) auth for the SPA |
| Background jobs | Celery 5 + RabbitMQ (broker) + Redis (results) | Campaign auto-dialing, retries |
| Scheduling | `django-celery-beat` | DB-backed periodic tasks |
| Database | PostgreSQL (Neon, via `dj-database-url`); SQLite fallback | Primary data store |
| Telephony | Exotel v1 REST API + Voicebot WebSocket streaming | Places calls, streams call audio |
| AI voice | OpenAI Realtime API (`gpt-realtime`, speech-to-speech) | The agent that talks on the call |
| AI text | OpenAI Chat Completions (`gpt-4o`) | Disposition classification (and legacy chat helpers) |
| Static files | WhiteNoise | Serves collected static assets |
| Deployment | Docker Compose (postgres, redis, rabbitmq, web, celery, celery-beat, nginx, certbot) | Full production stack; nginx terminates TLS, certbot auto-renews |

---

## 2. Big picture

```
                 ┌────────────────────────────── HTTP (REST, JWT) ─────────────────────────────┐
                 │                                                                              │
React SPA ───────┤  /api/auth/*   /api/leads/*   /api/campaigns/*   /api/calls/*   /api/analytics/*
(localhost:5173) │                                                                              │
                 └── WS /ws/calls/  ◄─── live call status + transcripts (group "live_calls")────┘
                                            ▲
                                            │ channel-layer group_send
                 ┌──────────────────────────┴───────────────────────────┐
                 │                 Django / Daphne (ASGI)                │
                 │                                                      │
   Celery worker │  dial_campaign_leads ──► exotel_client.dial() ───────┼──► Exotel v1 API
   (RabbitMQ)    │                                                      │    Calls/connect.json
                 │  media_consumer (WS /ws/exotel/media/) ◄─────────────┼─── Exotel Voicebot applet
                 │        │  ▲                                          │    (PCM16 8kHz audio)
                 │        ▼  │ G.711 µ-law 8 kHz                        │
                 │     ai_bridge ◄──────────────────────────────────────┼──► OpenAI Realtime API
                 │                                                      │    (wss, speech-to-speech)
                 │  StatusCallbackView (POST /api/calls/<id>/status/) ◄─┼─── Exotel status webhook
                 └──────────────────────────────────────────────────────┘
```

**Life of one AI call:**

1. A user clicks *Manual Dial* (or a campaign worker picks the next lead) → `exotel_client.dial()` POSTs to Exotel's `Calls/connect.json` with `From=<lead>`, `CallerId=<ExoPhone>`, `Url=<flow URL>`, `CustomField=call_id=<n>`.
2. Exotel rings the lead from the ExoPhone. On answer, the call enters the dashboard **flow**, whose **Voicebot applet** opens a WebSocket to `wss://PUBLIC_HOST/ws/exotel/media/`.
3. `ExotelMediaConsumer` receives the `start` event, resolves which `Call` row it is (via `CustomField`, falling back to `CallSid`), marks it `in_progress`, and spins up a `RealtimeBridge`.
4. The bridge opens a WebSocket to OpenAI Realtime, configures the session with the call's `system_prompt` and G.711 µ-law 8 kHz audio in both directions, and tells the model to greet the lead by name.
5. Audio flows: Exotel PCM16 → µ-law → OpenAI; OpenAI µ-law → PCM16 → Exotel (buffered in 320-byte frames, 3200-byte chunks). If the caller interrupts, OpenAI's VAD fires and the consumer sends Exotel a `clear` event to cut playback (barge-in).
6. OpenAI emits text transcripts of both sides; each one is saved as a `Transcript` row and broadcast to the `live_calls` group so the dashboard updates in real time.
7. Call ends → Exotel POSTs the terminal status to `/api/calls/<id>/status/` → duration is computed, `gpt-4o` classifies the disposition from the transcript, and a final status event is broadcast.

---

## 3. Repository layout

```
backend/
├── manage.py                  Standard Django CLI entrypoint
├── requirements.txt           Python dependencies
├── Dockerfile                 python:3.12-slim image; runs entrypoint.sh then daphne
├── entrypoint.sh              Waits for Postgres, runs migrate, collectstatic (web only)
├── docker-compose.yml         postgres / redis / rabbitmq / web / celery / celery-beat / nginx / certbot
├── nginx/templates/default.conf.template   TLS reverse proxy; ${DOMAIN} substituted at start
├── .env                       Local dev secrets/config (gitignored) — see §8
├── .env.docker                Production secrets/config for compose (gitignored)
├── config/                    Project package
│   ├── settings.py            All configuration (see §4)
│   ├── urls.py                Root URL map → mounts each app under /api/<app>/
│   ├── asgi.py                ProtocolTypeRouter: HTTP + two WebSocket routes
│   ├── wsgi.py                WSGI entrypoint (unused in practice; Daphne serves ASGI)
│   └── celery.py              Celery app; autodiscovers tasks from installed apps
└── apps/
    ├── accounts/              Custom user model, JWT auth endpoints, role permissions
    ├── leads/                 Lead model, list/search, bulk CSV-style upload
    ├── campaigns/             Campaign + CampaignLead, start/pause/stop, add leads
    ├── calls/                 ★ The core: Exotel dialing, AI bridge, transcripts, analytics feed
    └── analytics/             Aggregated dashboard metrics
```

Each app follows the same shape: `models.py`, `serializers.py`, `views.py`, `urls.py`, `admin.py`, `apps.py`, `migrations/`.

---

## 4. `config/` — project configuration

### `settings.py`

- **Core**: `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` all come from `.env` via `python-decouple`. `ALLOWED_HOSTS` defaults to `*` (fine for dev, tighten in prod).
- **`INSTALLED_APPS`**: `daphne` is listed *first* so `runserver` uses the ASGI/Daphne server (required for WebSockets in dev). Then Django contrib, DRF, SimpleJWT, corsheaders, channels, django-celery-beat, and the five project apps.
- **Middleware**: CORS first, then security, WhiteNoise (static serving), sessions, common, CSRF, auth, messages, clickjacking.
- **Database**: if `DATABASE_URL` is set (currently a Neon Postgres), it is parsed by `dj-database-url`; otherwise falls back to local SQLite.
- **`AUTH_USER_MODEL = accounts.CustomUser`** — email-based login, no username.
- **DRF defaults**: every endpoint requires JWT auth (`IsAuthenticated`) unless a view overrides it; page-number pagination, 50 per page.
- **SimpleJWT**: 8-hour access tokens, 7-day refresh tokens, signed with `JWT_SECRET`, `Bearer` header type.
- **CORS**: allows the Vite dev origin from `FRONTEND_ORIGIN`, credentials on.
- **Channel layer**: `CHANNEL_BACKEND=memory` selects `InMemoryChannelLayer` (single-process dev fallback for machines whose local Redis is older than v6, which `channels_redis` can't talk to). Otherwise `REDIS_URL` is parsed into a `RedisChannelLayer` config (capacity 1500, expiry 60s).
- **Celery**: broker = RabbitMQ (`CELERY_BROKER_URL`), results = Redis, JSON serialization, UTC, DB-backed beat scheduler.
- **Integration settings**: `EXOTEL_SID/API_KEY/API_SECRET/FROM_NUMBER/APP_ID`, `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL` (default `gpt-realtime`), `OPENAI_REALTIME_VOICE` (default `alloy`), `PUBLIC_HOST` (public hostname Exotel can reach — the ngrok host in dev).

### `asgi.py`

```
ProtocolTypeRouter
├── 'http'      → normal Django views
└── 'websocket' → URLRouter
    ├── ws/exotel/media/  → ExotelMediaConsumer   (no auth — Exotel's server connects here)
    └── ws/calls/         → AuthMiddlewareStack → LiveConsumer (frontend live feed)
```

### `urls.py`

| Prefix | App |
|---|---|
| `/admin/` | Django admin |
| `/api/auth/` | accounts |
| `/api/leads/` | leads |
| `/api/campaigns/` | campaigns |
| `/api/calls/` | calls |
| `/api/analytics/` | analytics |

### `celery.py` / `wsgi.py` / `manage.py`

Boilerplate. Celery app is named `callingcrm`, reads all `CELERY_*` settings, autodiscovers `tasks.py` in each app. WSGI exists but the deployment path is ASGI/Daphne.

---

## 5. The apps

### 5.1 `apps.accounts` — users & auth

- **`CustomUser`** (`AbstractBaseUser + PermissionsMixin`): `email` (unique, the login field), `name`, `role` ∈ {`super_admin`, `manager`, `bd_executive`}, `is_active`, `is_staff`, `created_at`. `CustomUserManager` handles password hashing; `create_superuser` forces `role=super_admin`.
- **Endpoints** (`/api/auth/…`):
  | Method & path | Auth | Behavior |
  |---|---|---|
  | `POST login/` | open | `LoginSerializer` authenticates email+password, returns `{access, refresh, user}` |
  | `POST register/` | open | Creates a user (any role — see §9 caveats), returns the user |
  | `POST refresh/` | open | SimpleJWT refresh-token exchange |
  | `GET me/` | JWT | Current user profile |
- **`permissions.py`** defines `IsSuperAdmin` and `IsManager` (manager = manager *or* super_admin). Defined but not currently applied to any view — everything else just requires login.
- **`admin.py`** registers a full `UserAdmin` with role filters.

### 5.2 `apps.leads` — contact book

- **`Lead`**: `phone` (unique, max 20), `name`, `company`, `email`, `extra_data` (JSON blob for arbitrary CSV columns), `status` ∈ {new, queued, called, interested, not_interested, callback, do_not_call}, timestamps. Ordered newest-first.
- **`normalize_phone()`** (serializers.py): strips non-digits; 10 digits → `+91XXXXXXXXXX`; 12 digits starting `91` → `+…`; otherwise prefixes `+`. India-centric normalization applied on bulk upload.
- **Endpoints** (`/api/leads/…`):
  | Method & path | Behavior |
  |---|---|
  | `GET /` | Paginated list; `?search=` over phone/name/company/email; `?ordering=` by created_at/name/status |
  | `POST bulk/` | Accepts a JSON array (or `{leads: [...]}`). Each row is validated (`phone` ≥ 7 digits) and normalized; duplicates (by phone) are skipped; valid new rows are `bulk_create`d. Returns `{created, duplicates, invalid[]}` — HTTP 207 if any row was invalid, else 201. |

### 5.3 `apps.campaigns` — organized calling drives

- **`Campaign`**: `name`, `status` ∈ {draft, running, paused, completed, stopped}, `system_prompt` (the AI agent's script/persona for every call in the campaign), `calling_window_start/end` (TimeFields, default 09:00–18:00), `rate_limit_per_min` (default 5), `created_by` (FK user), timestamps.
- **`CampaignLead`**: the join table — `campaign` + `lead` (unique together), `call_order`, `status` ∈ {pending, dialing, done, failed, skipped}.
- **Endpoints** (`/api/campaigns/…`), all JWT-protected:
  | Method & path | Behavior |
  |---|---|
  | `GET/POST /` | List / create (`created_by` set from the request user; serializer adds computed `lead_count`) |
  | `GET/PUT/PATCH/DELETE <id>/` | Retrieve / update / delete |
  | `POST <id>/start/` | draft/paused → running, then enqueues the Celery task `dial_campaign_leads` |
  | `POST <id>/pause/` | → paused (the worker loop notices and stops) |
  | `POST <id>/stop/` | → stopped |
  | `POST <id>/add-leads/` | `{lead_ids: [...]}` → get_or_create CampaignLead rows, returns `{added}` |

### 5.4 `apps.calls` — ★ telephony + AI core

#### Models

- **`Call`**: FKs to `campaign` and `lead` (both nullable, `SET_NULL`), `twilio_sid` (indexed — holds the **Exotel** call SID; the field name is a historical leftover), `system_prompt` (per-call override; manual dials store theirs here), `status` ∈ {initiated, ringing, in_progress, completed, no_answer, busy, failed, voicemail}, `disposition` ∈ {interested, not_interested, callback, no_answer, voicemail, pending}, `duration` (seconds), `recording_url` (currently unused), `started_at`, `ended_at`, `created_at`.
- **`Transcript`**: FK to call, `role` ∈ {ai, human}, `text`, `timestamp`. Ordered chronologically.

#### `exotel_client.py` — placing calls

`dial(lead, campaign, call_id) -> str`:

- Guards that `EXOTEL_APP_ID` is set (raises a self-explanatory error otherwise).
- POSTs to `https://api.exotel.com/v1/Accounts/{SID}/Calls/connect.json` with HTTP basic auth (`API_KEY:API_SECRET`) and form fields:
  - `From` = the lead's phone (the person Exotel dials),
  - `CallerId` = `EXOTEL_FROM_NUMBER` (the ExoPhone),
  - `Url` = `http://my.exotel.com/{SID}/exoml/start_voice/{APP_ID}` — the dashboard flow to run when answered (**Exotel does not fetch call-control XML from external servers**; the flow must be built in Exotel's App Bazaar),
  - `CallType=trans` (transactional),
  - `StatusCallback` = `https://{PUBLIC_HOST}/api/calls/{call_id}/status/`,
  - `CustomField=call_id={call_id}` — echoed back in the Voicebot stream so we can map the audio stream to the right DB row.
- On HTTP ≥ 400, raises `RuntimeError` containing Exotel's own `RestException.Message` (so API errors surface verbatim in the 502 response body). On success returns Exotel's call `Sid`.

#### `media_consumer.py` — Exotel Voicebot WebSocket (`/ws/exotel/media/`)

`ExotelMediaConsumer(AsyncWebsocketConsumer)` implements Exotel's bidirectional streaming protocol:

- **`start` event** → extracts `stream_sid`, `call_sid`, `custom_parameters`. Finds the `Call` by `call_id` (tolerating dict or raw `call_id=N` string forms of the custom field) or by `twilio_sid == call_sid`. Unknown stream → log + close. Otherwise: mark the call `in_progress` (+ `started_at`), broadcast a status event, and create a `RealtimeBridge` with the call's `system_prompt` (or a friendly default) and a greeting hint containing the lead's name.
- **`media` events** → base64 payload is PCM16LE 8 kHz mono from the caller; converted to µ-law and forwarded to the bridge.
- **`stop` event / disconnect** → closes the bridge (which closes the OpenAI socket).
- **Playback path** (bridge → caller): µ-law from OpenAI is converted to PCM16 and buffered; sent to Exotel as `media` events in **3200-byte chunks (200 ms)**; on end-of-response the remainder is flushed, zero-padded to a **320-byte (20 ms) frame boundary** — Exotel requires multiples of 320.
- **Barge-in**: when OpenAI detects the caller speaking, the consumer drops its playback buffer and sends Exotel `{"event": "clear"}` so queued AI audio stops immediately.
- **Transcripts**: every completed utterance (both roles) is saved via `database_sync_to_async` and broadcast to `live_calls` (broadcast failures are logged, never fatal to the call).

#### `ai_bridge.py` — OpenAI Realtime session (one per call)

`RealtimeBridge` owns a `websockets` connection to `wss://api.openai.com/v1/realtime?model={OPENAI_REALTIME_MODEL}`:

- On `connect(greeting_hint)`: sends `session.update` — audio-only output, the call's `system_prompt` as instructions, **G.711 µ-law (`audio/pcmu`) input and output** (8 kHz — matching the phone line, so no resampling anywhere), `server_vad` turn detection, `gpt-4o-mini-transcribe` input transcription, configured voice. Then a `response.create` so **the AI speaks first** (the greeting), and starts a receive loop task.
- `send_caller_audio(ulaw)` → `input_audio_buffer.append`.
- The receive loop dispatches (tolerating both GA and beta event names):
  - `response.output_audio.delta` → `on_audio(bytes)` (AI speech out),
  - `response.output_audio.done` → `on_audio_done()` (flush playback tail),
  - `input_audio_buffer.speech_started` → `on_interrupt()` (barge-in),
  - `conversation.item.input_audio_transcription.completed` → `on_transcript('human', …)`,
  - `response.output_audio_transcript.done` → `on_transcript('ai', …)`,
  - `error` → logged verbatim (primary debugging signal).

#### `audio.py`

Two one-liners over stdlib `audioop`: `pcm_to_ulaw` / `ulaw_to_pcm` (16-bit samples). Note in file: `audioop` is stdlib through Python 3.12; on 3.13+ install `audioop-lts`.

#### `consumers.py` — dashboard live feed (`/ws/calls/`)

`LiveConsumer`: joins channel-layer group `live_calls` on connect and relays every `live_update` message to the browser as JSON. Event shapes produced elsewhere:

```json
{"type": "call.status",     "call_id": 7, "status": "in_progress"}
{"type": "call.status",     "call_id": 7, "status": "completed", "disposition": "interested"}
{"type": "call.transcript", "call_id": 7, "role": "human", "text": "..."}
```

#### `views.py` — REST endpoints (`/api/calls/…`)

| Method & path | Auth | Behavior |
|---|---|---|
| `GET /` | JWT | Paginated call list (`CallSerializer` adds lead_name/lead_phone/campaign_name); ordering by created_at/status/duration |
| `GET <id>/` | JWT | Call detail incl. nested transcripts |
| `POST manual-dial/` | JWT | Body `{phone, name?, system_prompt?}`. Normalizes phone (prefixes `+` if missing), `get_or_create`s a Lead, creates a `Call` (with the given or default system prompt), calls `exotel_client.dial()`. Success → `{call_id, status, sid}`; failure → call marked `failed`, HTTP 502 with the Exotel error text. |
| `POST <id>/status/` | open (Exotel webhook) | Maps Exotel's `Status` to internal status. On terminal statuses (completed/failed/busy/no_answer): computes `duration` from `started_at`, runs **`detect_disposition_sync`** (gpt-4o) over the joined transcript (empty transcript → `no_answer`), stamps `ended_at`, broadcasts the final event. Non-terminal statuses just update + broadcast. Also captures `CallSid` if not yet stored. |

`_broadcast()` is a fire-and-forget channel-layer group_send guarded by try/except.

#### `tasks.py` — Celery jobs

- **`dial_campaign_leads(campaign_id)`** (retries ×2, 60 s delay): loops over the campaign's `pending` CampaignLeads in `call_order`; before each dial it re-reads the campaign (so pause/stop takes effect) and checks the **calling window**; paces dials at `60 / rate_limit_per_min` seconds via `time.sleep`; creates a `Call`, dials via `exotel_client` (imported under the legacy alias `twilio_client`), marks CampaignLead done/failed. A dial failure triggers a task-level retry.
- **`retry_failed_call(call_id)`** (retries ×2, 120 s delay): re-dials one call. Defined but not currently wired to any trigger.

#### `llm.py` — GPT text helpers

- `detect_disposition_sync` / `detect_disposition`: ask `gpt-4o` (temperature 0) to classify a transcript into one of the five dispositions; anything unexpected coerces to `not_interested`. The sync one is used by the status webhook.
- `get_response_sync` / `stream_response`: chat-completion reply generation — **legacy** from the pre-Realtime turn-based design; no longer called anywhere.

#### `twilio_client.py` — dead legacy module

The original Twilio implementation (ConversationRelay TwiML + `twilio` SDK). Nothing imports it, the `twilio` package isn't in `requirements.txt`, and the `TWILIO_*` settings it references no longer exist. Kept only as reference; safe to delete.

#### `migrations/`

`0001_initial` (Call + Transcript), `0002_call_system_prompt` (per-call prompt override).

### 5.5 `apps.analytics` — dashboard metrics

Single endpoint, `GET /api/analytics/summary/` (JWT), optional `?campaign=<id>` filter. Returns:

```json
{
  "total_calls": 42,
  "connected": 17,               // status == completed
  "connect_rate": 0.4048,
  "avg_duration": 93,            // seconds, completed calls only
  "dispositions": {"interested": 5, "...": 0},
  "calls_per_day": [{"date": "2026-07-01", "count": 9}, ...]   // last 14 days
}
```

`models.py`/`serializers.py` are intentionally empty — it aggregates over `Call`.

---

## 6. WebSocket endpoints

| Path | Client | Auth | Protocol |
|---|---|---|---|
| `/ws/exotel/media/` | Exotel's Voicebot applet | none (server-to-server) | Exotel bidirectional streaming: JSON events `connected`/`start`/`media`/`stop` in, `media`/`clear` out; audio = base64 raw PCM16LE 8 kHz mono |
| `/ws/calls/` | React dashboard | session middleware stack (frontend also appends `?token=`, currently unused server-side) | JSON `call.status` / `call.transcript` events, broadcast to all connected clients |

---

## 7. External services

| Service | Used for | Failure mode handled |
|---|---|---|
| **Exotel v1 REST** (`api.exotel.com`, basic auth) | Placing calls (`Calls/connect.json`) | Error body surfaced into the API response |
| **Exotel Voicebot applet** | Streaming call audio to/from the backend | Unknown stream → closed; stop → bridge cleanup. ⚠ Must be added to the dashboard flow and may need enabling by Exotel support |
| **Exotel status webhook** | Terminal call status → duration + disposition | Unreachable `PUBLIC_HOST` just means statuses never arrive (calls stay `in_progress`) |
| **OpenAI Realtime** (wss) | The live voice agent | Errors logged; socket closed with the call |
| **OpenAI Chat Completions** | Disposition classification | Invalid output coerced; webhook never 500s because of it |
| **Neon Postgres / Redis / RabbitMQ** | Storage / channel layer + results / Celery broker | Redis <6 → set `CHANNEL_BACKEND=memory`; RabbitMQ only needed for campaigns |

---

## 8. Environment variables (`backend/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `DEBUG` | no (default true) | Django debug mode |
| `SECRET_KEY` | prod | Django secret |
| `JWT_SECRET` | prod | SimpleJWT signing key |
| `ALLOWED_HOSTS` | prod | Comma-separated hosts |
| `DATABASE_URL` | no | Postgres URL; unset → SQLite |
| `REDIS_URL` | when using Redis layer | Channel layer + Celery results |
| `CHANNEL_BACKEND` | no | `memory` = in-process channel layer (dev fallback for Redis < 6) |
| `CELERY_BROKER_URL` | for campaigns | RabbitMQ AMQP URL |
| `EXOTEL_SID` | **yes** | Exotel account SID |
| `EXOTEL_API_KEY` / `EXOTEL_API_SECRET` | **yes** | Exotel API basic-auth pair |
| `EXOTEL_FROM_NUMBER` | **yes** | The ExoPhone (virtual number) — must actually exist on the account |
| `EXOTEL_APP_ID` | **yes** | Numeric id of the App Bazaar flow run on outbound calls |
| `OPENAI_API_KEY` | **yes** | Realtime voice + gpt-4o disposition |
| `OPENAI_REALTIME_MODEL` | no (`gpt-realtime`) | Realtime model override |
| `OPENAI_REALTIME_VOICE` | no (`alloy`) | Agent voice (marin, cedar, coral, …) |
| `PUBLIC_HOST` | **yes** | Public hostname (ngrok in dev) — used in the status-callback URL and as the host Exotel's Voicebot must reach (`wss://PUBLIC_HOST/ws/exotel/media/`) |
| `FRONTEND_ORIGIN` | no | CORS allow-list (Vite dev server) |

---

## 9. Deployment & local dev

### Docker Compose (production)

`docker-compose.yml` runs: **postgres:16** (credentials from `.env.docker`; data in the `postgres_data` volume — this *is* the production database), **redis:7**, **rabbitmq:3-management** (mgmt UI on :15673), **web** (Dockerfile → `entrypoint.sh` waits for Postgres, migrates, collectstatic, then `daphne -b 0.0.0.0 -p 8000 config.asgi:application`), **celery** worker (-c 4), **celery-beat**, **nginx** on :80/:443 (config generated from `nginx/templates/default.conf.template` with `$DOMAIN`; proxies `/api/`, `/admin/`, `/static/`, and `/ws/` with WebSocket upgrade + 24 h timeouts), and **certbot** (renews the Let's Encrypt cert twice daily via webroot).

Server deployment, in order:

```bash
# 0. DNS A record for yourdomain.com → server IP; fill YOURDOMAIN.COM in .env.docker
# 1. one-time certificate bootstrap (port 80 must be free, so before first up):
docker compose run --rm -p 80:80 --entrypoint \
  "certbot certonly --standalone -d yourdomain.com --agree-tos -m you@example.com --non-interactive" certbot
# 2. start everything
docker compose up -d --build
# 3. first admin account (fresh database)
docker compose exec web python manage.py createsuperuser
# 4. after each cert renewal cycle nginx needs a reload (or just):  docker compose restart nginx
```

Then set the Exotel Voicebot applet URL to `wss://yourdomain.com/ws/exotel/media/` — permanent, unlike a dev tunnel.

### Local dev (current workflow)

```powershell
# 1. tunnel first (Voicebot needs a public wss URL)
ngrok http 8000            # → put hostname into PUBLIC_HOST in .env
                           # → and into the Voicebot applet URL in Exotel's flow
# 2. backend
venv\Scripts\activate
cd backend
py manage.py runserver     # Daphne serves HTTP + WS on :8000
# 3. only if running campaigns:
celery -A config worker -l info
```

Frontend (Vite) runs separately on :5173 with `VITE_API_URL` / `VITE_WS_URL` pointing at :8000.

### Exotel dashboard prerequisites

1. An **ExoPhone** assigned to the account (= `EXOTEL_FROM_NUMBER`).
2. A **flow** in App Bazaar (= `EXOTEL_APP_ID`) whose first applet is **Voicebot**, pointed at `wss://<PUBLIC_HOST>/ws/exotel/media/`. The Voicebot applet may need to be enabled by Exotel support ("bidirectional voice streaming").

---

## 10. Known gaps & caveats

- **`PUBLIC_HOST` must be kept in sync** with the current ngrok hostname in *two* places: `.env` and the Voicebot applet URL. Free ngrok changes hostname on every restart.
- **`twilio_sid` field name** is historical; it stores Exotel SIDs.
- **`twilio_client.py` is dead code** (would `ImportError` if imported — `twilio` isn't installed). Delete when convenient.
- **`llm.py`'s chat helpers** (`get_response_sync`, `stream_response`) are unused since the Realtime migration; only the disposition functions matter.
- **`retry_failed_call`** exists but nothing schedules it.
- **Open endpoint**: `POST /api/calls/<id>/status/` accepts unauthenticated POSTs (needed for the Exotel webhook, but unvalidated — Exotel offers no signature; IP allow-listing would be the hardening path). Registration is restricted to super admins; bootstrap the first admin with `createsuperuser`.
- **Campaign dialing requires RabbitMQ + a Celery worker running**; the manual-dial path does not.
- **`CHANNEL_BACKEND=memory`** only works single-process. With multiple Daphne processes/containers, live updates need real Redis (≥ v6).
- **Calling-window check** in `dial_campaign_leads` uses server-local time (`timezone.localtime` with `TIME_ZONE=UTC`) — campaign windows are effectively UTC, not IST.
- **Secrets currently live in `.env`** (Exotel keys, OpenAI key, Neon DB URL). The file is gitignored, but rotate any key that has ever been committed or shared.
