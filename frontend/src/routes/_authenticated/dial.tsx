import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { PhoneCall, PhoneOff, Delete, Loader2 } from "lucide-react";
import { useManualDialMutation, useEndCallMutation } from "@/features/calls/callsApi";
import type { RootState } from "@/app/store";
import { PageHeader } from "@/components/PageHeader";
import { WS_URL } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/dial")({
  head: () => ({
    meta: [
      { title: "Manual Dial — LeadGen+" },
      { name: "description", content: "Trigger a one-off AI call to any number." },
    ],
  }),
  component: DialPage,
});

// Mirrors NEVO_SYSTEM_PROMPT in backend/apps/calls/nevo_prompt.py, which is the
// fallback when a call carries no prompt of its own. Product facts live in the
// backend fact sheet (NEVO_FACT_SHEET), the agent's only source of truth; the
// opening line is generated backend-side (media_consumer._greeting_hint). Keep
// this roughly in sync with the backend script. No SSML tags: OpenAI Realtime
// speaks text directly and would read them aloud.
const DEFAULT_PROMPT = `You are Priya, a representative from Nuvo Eon Diamonds, a Mumbai-based supplier of lab-grown diamonds. You call jewellery shop owners and purchase managers to introduce Nuvo Eon as a supply partner — IGI certified and non-certified lab-grown diamonds, all fancy shapes, different sizes, 30 pointer and above.

This is a B2B conversation. Your job is NOT to quote prices or close a deal — it is to qualify the lead and arrange a callback from a senior who handles pricing and full details.

HOW TO SPEAK:
- Natural Hinglish, the way metro-India city people talk. Speak like an NRI, English words wherever you can.
- Sentences VERY short and natural. No stiff or formal Hindi — use the English word instead.
- English for technical terms: lab-grown diamond, IGI certified, non-certified, pointer, carat, shape, size, supply, margin, sample, delivery.
- Do NOT make it an interview — never fire a question after every sentence. Never stack a question and its possible answers together.
- Warm and professional — a chai pe charcha, not a brochure. Your name is Priya; never introduce yourself using the customer's name. Never say you are an AI.

RUN THE CALL (a guide, not a script to recite):
1. VERIFY the right person. If not the owner/purchase manager, ask for whoever handles purchase of lab-grown diamonds or diamond jewellery; if unavailable, capture name, number, and a good callback time, then exit.
2. PERMISSION HOOK — one line: Nuvo Eon supplies certified and non-certified lab-grown diamonds from Mumbai, 30 pointer and above. Say you'll take a minute; ask if you can ask two quick questions.
3. QUALIFY (openly, not a checklist): do they deal in lab-grown diamonds; is diamond jewellery moving well; if not in lab-grown, any plan to start (margins are good lately). Skip what they've told you; never re-ask.
4. PITCH only the ONE version that matches them — already dealing / new to lab-grown / planning to start — in short sentences.
5. SCHEDULE A SENIOR CALLBACK when there is interest, and the MOMENT they ask price/certification/terms/samples/"more info". Say a senior will call personally for pricing and full details; ask the best day and time. CONFIRM IT: read the day and time back exactly as they said it and wait for their yes — never change the day (Sunday is not Monday), never shift the time (6 is not 5), never round it. If you did not clearly catch it, ask them to repeat rather than guess.

PRICING — CRITICAL: You NEVER quote a price, rate, discount, or terms. The moment it comes up, move to the senior callback. Rates depend on size, shape, and certification — the senior gives exact pricing.

HANDLING COMMON SITUATIONS (keep replies very short):
- Busy / driving: acknowledge, offer this evening or tomorrow, ask what time suits, capture it, exit.
- Not the decision-maker: ask who handles the purchase and a good time; capture name and time; close warmly.
- Asks price/rate: rates depend on size, shape, certification — senior gives exact pricing; offer that call. Never quote.
- Asks certification/terms/samples: the senior explains and arranges everything; offer to set up the call.
- Already has a supplier: good — most keep a second source to compare; once the senior shows rates they'll have the option, no pressure. Offer the callback.
- Doubts lab-grown ("are these real?"): real diamonds, same properties as natural, IGI certified, cost less so margins are attractive; senior shares the full picture.
- "Send on WhatsApp": confirm this number is on WhatsApp; the senior sends details and calls back.
- Not interested: thank them; one line — if they ever need lab-grown diamonds, remember Nuvo Eon, Mumbai. Don't push.
- Where is the office: Mumbai — Bharat Diamond House, BKC. Supplies across India, focus on quality and timely delivery.
- DND / stop calling: apologise immediately and end the call. No further pitch.
- Wants email: ask for their email, capture it, reconfirm it back.
- Wrong number: reconfirm you dialled the right business; if yes continue, if no apologise and end.
- Voicemail / automated system: don't pitch — plan to call later and end.

HARD CONSTRAINTS:
- Use ONLY the facts you have been given. Never invent company or product info.
- Never quote or hint at prices, discounts, stock, or delivery — hand it to the senior.
- A callback is a fallback and the senior handoff is the goal — never offer or ask about a callback unless there is interest, they can't talk now, or they ask for a senior.
- WHEN IN DOUBT, KEEP TALKING. A garbled or name-only reply is not a refusal — assume it's a good time and carry on.
- NEVER invent a callback day or time — only repeat back one the caller said; if unclear, ask again.
- Mirror the caller's language (English / Hindi / Hinglish). Say the customer's own name in Devanagari, never transliterated.
- Say "Nuvo Eon Diamonds", "WhatsApp", "Lab-Grown Diamonds" and "IGI" in English every time, even mid-Hindi-sentence. Never नुवो ऐऑन डायमंड्स, never व्हाट्सएप.

CLOSING: End every call warmly, lead captured or not. If interested, remind them a senior will call at the agreed time and details can come on WhatsApp. A warm Hindi sign-off like "आपका दिन शुभ हो" works well, then hang up.`;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "⌫"];

const COUNTRY_CODES: { code: string; dial: string; label: string; flag: string }[] = [
  { code: "IN", dial: "+91", label: "India", flag: "🇮🇳" },
  { code: "US", dial: "+1", label: "United States", flag: "🇺🇸" },
  { code: "GB", dial: "+44", label: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", dial: "+1", label: "Canada", flag: "🇨🇦" },
  { code: "AU", dial: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "AE", dial: "+971", label: "UAE", flag: "🇦🇪" },
  { code: "SG", dial: "+65", label: "Singapore", flag: "🇸🇬" },
  { code: "DE", dial: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "FR", dial: "+33", label: "France", flag: "🇫🇷" },
  { code: "BR", dial: "+55", label: "Brazil", flag: "🇧🇷" },
  { code: "ZA", dial: "+27", label: "South Africa", flag: "🇿🇦" },
  { code: "JP", dial: "+81", label: "Japan", flag: "🇯🇵" },
];

function DialPage() {
  const [countryIdx, setCountryIdx] = useState(0);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [callId, setCallId] = useState<string | number | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [disposition, setDisposition] = useState<string | null>(null);
  const token = useSelector((s: RootState) => s.auth.token);
  const [manualDial, { isLoading, error }] = useManualDialMutation();
  const [endCall, { isLoading: isEnding }] = useEndCallMutation();
  const [endError, setEndError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!callId || !token) return;
    const ws = new WebSocket(`${WS_URL}/calls/?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (String(data.call_id) !== String(callId)) return;
        if (data.type === "call.status") {
          setCallStatus(data.status);
          if (data.disposition) setDisposition(data.disposition);
        }
        if (data.type === "call.transcript") {
          setTranscript((prev) => [...prev, { role: data.role, text: data.text }]);
        }
      } catch {}
    };
    return () => ws.close();
  }, [callId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const TERMINAL = ["completed", "failed", "busy", "no_answer"];
  const canDial = !isLoading && (!callStatus || TERMINAL.includes(callStatus));
  // Only offer End call once there is a call id to end and it is still live.
  const isLive = !!callId && !!callStatus && !TERMINAL.includes(callStatus);

  function press(k: string) {
    if (k === "⌫") setPhone((p) => p.slice(0, -1));
    else setPhone((p) => p + k);
  }

  async function handleEnd() {
    if (!callId) return;
    setEndError(null);
    try {
      await endCall(callId).unwrap();
      // Status stays as-is until Exotel's webhook confirms the real hangup.
    } catch (e: any) {
      setEndError(e?.data?.error || "Could not end the call — it may have already ended.");
    }
  }

  async function handleDial() {
    if (!phone.trim()) return;
    setTranscript([]);
    setDisposition(null);
    setCallStatus("initiated");
    setCallId(null);
    try {
      const fullNumber = `${COUNTRY_CODES[countryIdx].dial}${phone.trim().replace(/^0+/, "")}`;
      const res = await manualDial({
        phone: fullNumber,
        name: name.trim(),
        system_prompt: prompt,
      }).unwrap();
      setCallId(res.call_id);
    } catch {
      setCallStatus("failed");
    }
  }

  const country = COUNTRY_CODES[countryIdx];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Manual Dial"
        subtitle="Fire a single AI-driven call and watch the transcript live."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Dialer card — sticky */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="glass rounded-2xl p-5 shadow-(--shadow-card)">
            <div className="rounded-xl border border-border bg-background/60 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Number
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="relative shrink-0">
                  <select
                    value={countryIdx}
                    onChange={(e) => setCountryIdx(Number(e.target.value))}
                    aria-label="Country code"
                    className="appearance-none rounded-lg border border-border bg-surface/70 py-2 pl-2 pr-7 font-mono text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {COUNTRY_CODES.map((c, i) => (
                      <option key={c.code} value={i}>
                        {c.flag} {c.dial} {c.code}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    ▼
                  </span>
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="9XXXXXXXXX"
                  inputMode="numeric"
                  className="min-w-0 flex-1 bg-transparent font-mono tabular text-xl font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
              </div>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                Dialing: {country.dial} {phone || "—"}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className="grid h-12 place-items-center rounded-xl border border-border bg-surface/60 font-display text-lg font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 active:scale-95"
                >
                  {k === "⌫" ? <Delete className="h-5 w-5" /> : k}
                </button>
              ))}
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact name (optional)"
              className="mt-4 w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            {isLive ? (
              <button
                onClick={handleEnd}
                disabled={isEnding}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground transition-all hover:bg-destructive/90 disabled:opacity-50"
              >
                {isEnding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PhoneOff className="h-4 w-4" />
                )}
                {isEnding ? "Ending…" : "End call"}
              </button>
            ) : (
              <button
                onClick={handleDial}
                disabled={!canDial || !phone.trim()}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-(--shadow-glow) transition-all hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PhoneCall className="h-4 w-4" />
                )}
                {isLoading ? "Connecting…" : "Start call"}
              </button>
            )}

            {!!error && (
              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {(error as any)?.data?.error || "Call failed — check API & Twilio credentials."}
              </p>
            )}

            {!!endError && (
              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {endError}
              </p>
            )}
          </div>
        </div>

        {/* Live panel — scrolls with page */}
        <div className="glass flex flex-col rounded-2xl p-5 shadow-(--shadow-card)">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                AI Instructions
              </p>
              <h3 className="font-display text-base font-semibold text-foreground">
                System prompt
              </h3>
            </div>
            {callStatus && <StatusBadge status={callStatus} />}
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={isLoading}
            className="mt-3 w-full resize-none rounded-lg border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          {disposition && (
            <p className="mt-3 text-xs text-muted-foreground">
              Disposition:{" "}
              <span className="capitalize text-foreground">
                {disposition.replace(/_/g, " ")}
              </span>
            </p>
          )}

          <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
            {transcript.length === 0 ? (
              <div className="grid min-h-60 place-items-center text-center">
                <div>
                  <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {callStatus
                      ? "Waiting for conversation…"
                      : "Live transcript appears here once the call connects."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {transcript.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "ai" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        m.role === "ai"
                          ? "bg-primary/15 text-foreground"
                          : "bg-accent text-foreground"
                      }`}
                    >
                      <span className="mb-1 block text-[10px] uppercase tracking-widest opacity-60">
                        {m.role === "ai" ? "AI" : "Caller"}
                      </span>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
