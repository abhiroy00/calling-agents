import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, X, Play } from "lucide-react";
import { useGetCallQuery, useGetCallsQuery } from "@/features/calls/callsApi";
import { PageHeader, Chip } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Call History — LeadGen+" },
      { name: "description", content: "Browse past AI calls, transcripts, and recordings." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const { data, isFetching } = useGetCallsQuery({ page });
  const calls = data?.results || data || [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Conversations"
        title="Call history"
        subtitle="Every call, every transcript, every disposition — searchable."
        tabs={[
          { label: "All calls", value: "all", count: calls.length },
          { label: "Connected", value: "connected" },
          { label: "Voicemail", value: "voicemail" },
          { label: "Callbacks", value: "callback" },
          { label: "Failed", value: "failed" },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-card)]">
        <Chip label="Today" active={range === "today"} onClick={() => setRange("today")} />
        <Chip label="Last 7 days" active={range === "7d"} onClick={() => setRange("7d")} />
        <Chip label="Last 30 days" active={range === "30d"} onClick={() => setRange("30d")} />
        <Chip label="All time" active={range === "all"} onClick={() => setRange("all")} />
        <span className="mx-1 h-5 w-px bg-border" />
        <Chip label="Any agent" />
        <Chip label="Any campaign" />
        <Chip label="Any outcome" />
      </div>

      <div className="glass hidden overflow-hidden rounded-xl md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Lead</th>
              <th className="px-4 py-3 text-left">Campaign</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Disposition</th>
              <th className="px-4 py-3 text-left">Duration</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isFetching && calls.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No calls yet
                </td>
              </tr>
            )}
            {calls.map((c: any) => (
              <tr
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="cursor-pointer border-t border-border/60 hover:bg-accent/40"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{c.lead_name || "—"}</p>
                  <p className="mt-0.5 font-mono text-xs tabular text-muted-foreground">
                    {c.lead_phone}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.campaign_name || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.disposition} />
                </td>
                <td className="px-4 py-3 tabular text-muted-foreground">
                  {c.duration ? `${c.duration}s` : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="grid gap-3 md:hidden">
        {calls.map((c: any) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className="glass grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-4 text-left"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{c.lead_name || "—"}</p>
              <p className="mt-0.5 font-mono text-xs tabular text-muted-foreground">
                {c.lead_phone}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={c.status} />
              <StatusBadge status={c.disposition} />
            </div>
          </button>
        ))}
      </div>

      {data?.count > 50 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={calls.length < 50}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedId != null && (
        <CallDetail id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function CallDetail({ id, onClose }: { id: string | number; onClose: () => void }) {
  const { data: call, isFetching } = useGetCallQuery(id);
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border/60 bg-surface shadow-2xl">
        <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-5 py-4">
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Call detail
            </p>
            <h2 className="truncate font-display text-lg font-semibold text-foreground">
              {call?.lead_name || "Unknown lead"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 p-5">
          {isFetching && <p className="text-sm text-muted-foreground">Loading…</p>}
          {call && (
            <>
              <div className="glass rounded-xl p-4">
                <p className="font-mono text-sm tabular text-foreground">{call.lead_phone}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={call.status} />
                  <StatusBadge status={call.disposition} />
                </div>
              </div>

              {call.recording_url && (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <Play className="h-3.5 w-3.5" /> Recording
                  </p>
                  <audio controls src={call.recording_url} className="w-full" />
                </div>
              )}

              <div>
                <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Transcript
                </p>
                {(call.transcripts || []).length === 0 ? (
                  <p className="rounded-lg border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
                    No transcript available for this call.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(call.transcripts || []).map((t: any) => (
                      <div
                        key={t.id}
                        className={`flex gap-2 ${t.role === "ai" ? "" : "flex-row-reverse"}`}
                      >
                        <div
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                            t.role === "ai"
                              ? "bg-primary/20 text-primary"
                              : "bg-accent text-foreground"
                          }`}
                        >
                          {t.role === "ai" ? "AI" : "C"}
                        </div>
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                            t.role === "ai"
                              ? "bg-primary/10 text-foreground"
                              : "bg-accent text-foreground"
                          }`}
                        >
                          {t.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
