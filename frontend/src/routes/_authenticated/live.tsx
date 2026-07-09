import { createFileRoute } from "@tanstack/react-router";
import { useSelector } from "react-redux";
import { Radio, PhoneCall, PhoneOff, Signal } from "lucide-react";
import useCallSocket from "@/features/calls/useCallSocket";
import type { RootState } from "@/app/store";
import { PageHeader, StatCard } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/live")({
  head: () => ({
    meta: [
      { title: "Live Board — LeadGen+" },
      { name: "description", content: "Realtime view of every in-flight AI call." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  useCallSocket();
  const liveCalls = useSelector((s: RootState) => s.calls.liveCalls);
  const calls = Object.values(liveCalls);
  const active = calls.filter((c) =>
    ["in_progress", "ringing", "initiated"].includes(c.status || ""),
  );
  const connected = calls.filter((c) => c.status === "in_progress").length;
  const dialed = calls.length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Live Call Board"
        subtitle="Realtime feed streamed from the calling worker via WebSocket"
        actions={
          <div className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-xs text-success">
            <Signal className="h-3.5 w-3.5" />
            Streaming
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Dialed" value={dialed} accent="primary" />
        <StatCard label="Connected" value={connected} accent="success" />
        <StatCard
          label="Connect rate"
          value={dialed ? `${Math.round((connected / dialed) * 100)}%` : "—"}
        />
        <StatCard label="Live now" value={active.length} accent="success" hint="active channels" />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Active channels
          </p>
        </div>

        {active.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-border/60 bg-surface/40 p-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <PhoneOff className="h-5 w-5" />
            </div>
            <p className="mt-4 font-display text-lg font-semibold text-foreground">
              Nothing on the wire
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Start a campaign or fire a manual dial to see channels appear here in realtime.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((call) => (
              <div
                key={call.call_id}
                className="glass rounded-xl p-4 transition-colors hover:border-primary/40"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      call.status === "in_progress"
                        ? "bg-success/15 text-success"
                        : call.status === "ringing"
                          ? "bg-info/15 text-info"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">
                      Call #{call.call_id}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {call.status === "in_progress" ? "in progress" : call.status || "pending"}
                    </p>
                  </div>
                  <StatusBadge status={call.status} />
                </div>
                {call.disposition && call.disposition !== "pending" && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Disposition:{" "}
                    <span className="capitalize text-foreground">
                      {call.disposition.replace(/_/g, " ")}
                    </span>
                  </p>
                )}
                {call.transcript && call.transcript.length > 0 && (
                  <p className="mt-2 line-clamp-2 rounded-md bg-background/60 p-2 text-xs text-muted-foreground">
                    {call.transcript[call.transcript.length - 1].text}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
