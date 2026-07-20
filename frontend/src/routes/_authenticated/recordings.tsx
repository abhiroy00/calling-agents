import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Mic, Download, Play, Loader2 } from "lucide-react";
import {
  useGetCallsQuery,
  useLazyGetRecordingUrlQuery,
} from "@/features/calls/callsApi";
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

function RecordingCard({ call }: { call: any }) {
  // The recording URL is fetched from our backend only when the user asks to
  // play — the backend calls Exotel to mint a fresh (often presigned) link.
  // Never hit Exotel directly from here; that would leak the API token.
  const [fetchUrl, { data, isFetching, error }] = useLazyGetRecordingUrlQuery();
  const url = data?.recording_url;

  return (
    <div className="glass rounded-2xl p-4 shadow-(--shadow-card)">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {call.lead_name || "Unknown lead"}
          </p>
          <p className="mt-0.5 font-mono text-xs tabular text-muted-foreground">
            {call.lead_phone || "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={call.disposition} />
          <span className="tabular text-xs text-muted-foreground">
            {formatDuration(call.duration)}
          </span>
          <span className="text-xs text-muted-foreground">
            {call.created_at ? new Date(call.created_at).toLocaleString() : "—"}
          </span>
        </div>
      </div>

      {url ? (
        <>
          <audio controls autoPlay preload="none" src={url} className="mt-3 w-full" />
          <div className="mt-2 flex justify-end">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </div>
        </>
      ) : error ? (
        <p className="mt-3 rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
          Could not load this recording.{" "}
          {call.recording_url && (
            <a
              href={call.recording_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Try the stored link <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </p>
      ) : (
        <button
          onClick={() => fetchUrl(call.id)}
          disabled={isFetching}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 disabled:opacity-50"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isFetching ? "Loading…" : "Load recording"}
        </button>
      )}
    </div>
  );
}

function RecordingsPage() {
  // Server-side filter: only calls Exotel gave us a recording URL for.
  const { data, isFetching, error } = useGetCallsQuery({ has_recording: "true" });
  const calls: any[] = data?.results || data || [];

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
          <RecordingCard key={c.id} call={c} />
        ))}
      </div>
    </div>
  );
}
