import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { PhoneCall, Delete, Loader2 } from "lucide-react";
import { useManualDialMutation } from "@/features/calls/callsApi";
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

const DEFAULT_PROMPT = `You are "LeadGen+ AI Assistant".
Speak naturally like a human. Qualify the lead, understand their needs, answer basic questions, and book a demo if they're interested. Keep it under two minutes.`;

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

  const canDial = !isLoading && (!callStatus || ["completed", "failed"].includes(callStatus));

  function press(k: string) {
    if (k === "⌫") setPhone((p) => p.slice(0, -1));
    else setPhone((p) => p + k);
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
          <div className="glass rounded-2xl p-5 shadow-[var(--shadow-card)]">
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

            <button
              onClick={handleDial}
              disabled={!canDial || !phone.trim()}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PhoneCall className="h-4 w-4" />
              )}
              {isLoading ? "Connecting…" : "Start call"}
            </button>

            {!!error && (
              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {(error as any)?.data?.error || "Call failed — check API & Twilio credentials."}
              </p>
            )}
          </div>
        </div>

        {/* Live panel — scrolls with page */}
        <div className="glass flex flex-col rounded-2xl p-5 shadow-[var(--shadow-card)]">
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
              <div className="grid min-h-[240px] place-items-center text-center">
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
