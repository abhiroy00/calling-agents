import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Phone, Mail, Building2, Sparkles } from "lucide-react";
import { useGetLeadsQuery } from "@/features/leads/leadsApi";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — LeadGen+" },
      { name: "description", content: "Leads who asked for a callback or meeting on a call." },
    ],
  }),
  component: MeetingsPage,
});

const INTEREST_STYLES: Record<string, string> = {
  high: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
  none: "bg-muted text-muted-foreground",
};

function MeetingsPage() {
  // Server-side: only leads who requested a callback/demo/meeting on a call.
  const { data, isFetching, error } = useGetLeadsQuery({ has_meeting: "true" });
  const leads: any[] = data?.results || data || [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Pipeline"
        title="Meetings & callbacks"
        subtitle="Leads who asked to be contacted — with the day and time they gave."
      />

      {!!error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Could not load meeting requests.
        </p>
      )}

      {isFetching && leads.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      )}

      {!isFetching && leads.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center shadow-(--shadow-card)">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">No meeting requests yet</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
            When a caller asks for a callback, demo, or meeting, the agent captures
            it and the lead shows up here with the day and time they mentioned.
          </p>
        </div>
      )}

      <div className="grid gap-3">
        {leads.map((lead: any) => {
          const m = lead.meeting || {};
          const interest = String(lead.interest_level || "").toLowerCase();
          return (
            <div key={lead.id} className="glass rounded-2xl p-4 shadow-(--shadow-card)">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {lead.name || "Unknown lead"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 font-mono tabular">
                      <Phone className="h-3 w-3" /> {lead.phone || "—"}
                    </span>
                    {lead.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {lead.email}
                      </span>
                    )}
                    {lead.company && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {lead.company}
                      </span>
                    )}
                  </div>
                </div>
                {interest && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      INTEREST_STYLES[interest] || INTEREST_STYLES.none
                    }`}
                  >
                    <Sparkles className="h-3 w-3" /> {interest} interest
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">
                <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground">
                  {m.preferred_day || m.preferred_time
                    ? [m.preferred_day, m.preferred_time].filter(Boolean).join(", ")
                    : "No specific time given"}
                </span>
                {m.notes && (
                  <span className="text-muted-foreground">— {m.notes}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
