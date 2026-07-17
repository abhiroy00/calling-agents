import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Mic, Download } from "lucide-react";
import { useGetCallsQuery } from "@/features/calls/callsApi";
import { PageHeader } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/recordings")({
  head: () => ({
    meta: [
      { title: "Recordings — LeadGen+" },
      { name: "description", content: "Listen back to recorded AI calls." },
    ],
  }),
  component: RecordingsPage,
});

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function RecordingsPage() {
  // Server-side filter: only calls Exotel gave us a recording URL for.
  const { data, isFetching, error } = useGetCallsQuery({ has_recording: "true" });
  const calls: any[] = data?.results || data || [];
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Conversations"
        title="Recordings"
        subtitle="Listen back to calls Exotel recorded."
      />

      {!!error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Could not load recordings.
        </p>
      )}

      {isFetching && calls.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      )}

      {!isFetching && calls.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center shadow-(--shadow-card)">
          <Mic className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">No recordings yet</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            Recordings appear here once a call ends. If calls are completing but
            nothing shows up, recording is probably not switched on in the Exotel
            flow — Exotel only sends a recording link when it is.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {calls.map((c: any) => (
          <div key={c.id} className="glass rounded-2xl p-4 shadow-(--shadow-card)">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {c.lead_name || "Unknown lead"}
                </p>
                <p className="mt-0.5 font-mono text-xs tabular text-muted-foreground">
                  {c.lead_phone || "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={c.disposition} />
                <span className="tabular text-xs text-muted-foreground">
                  {formatDuration(c.duration)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                </span>
              </div>
            </div>

            {failed[c.id] ? (
              // The URL is Exotel's, not ours — if the browser cannot fetch it,
              // say so rather than showing a silently dead player.
              <p className="mt-3 rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                This recording could not be played in the browser.{" "}
                <a
                  href={c.recording_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open it directly <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            ) : (
              <audio
                controls
                preload="none"
                src={c.recording_url}
                onError={() => setFailed((f) => ({ ...f, [c.id]: true }))}
                className="mt-3 w-full"
              />
            )}

            <div className="mt-2 flex justify-end">
              <a
                href={c.recording_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
