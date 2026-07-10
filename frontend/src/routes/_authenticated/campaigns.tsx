import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Pause, Square, Plus, X, Megaphone, Filter, Search, Users, Phone } from "lucide-react";
import {
  useCreateCampaignMutation,
  useGetCampaignsQuery,
  usePauseCampaignMutation,
  useStartCampaignMutation,
  useStopCampaignMutation,
  useAddLeadsToCampaignMutation,
} from "@/features/campaigns/campaignsApi";
import { useGetLeadsQuery } from "@/features/leads/leadsApi";
import { PageHeader, Chip, EmptyState } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns — LeadGen+" },
      { name: "description", content: "Create and control AI calling campaigns." },
    ],
  }),
  component: CampaignsPage,
});

function CampaignsPage() {
  const { data, isFetching } = useGetCampaignsQuery();
  const [start] = useStartCampaignMutation();
  const [pause] = usePauseCampaignMutation();
  const [stop] = useStopCampaignMutation();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [scope, setScope] = useState<"all" | "mine">("all");

  const campaigns = data?.results || data || [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Sequences"
        title="Campaigns"
        subtitle={`${campaigns.length} configured · start, pause, or stop from here`}
        tabs={[
          { label: "All", value: "all", count: campaigns.length },
          { label: "Running", value: "running" },
          { label: "Paused", value: "paused" },
          { label: "Drafts", value: "draft" },
          { label: "Archived", value: "archived" },
        ]}
        actions={
          <button
            onClick={() => setBuilderOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 sm:text-sm"
          >
            <Plus className="h-4 w-4" /> New campaign
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-card)]">
        <Chip label="Any owner" active={scope === "all"} onClick={() => setScope("all")} />
        <Chip label="My campaigns" active={scope === "mine"} onClick={() => setScope("mine")} />
        <span className="mx-1 h-5 w-px bg-border" />
        <Chip label="Created 30d" />
        <Chip label="Any window" />
        <button className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground hover:text-foreground">
          <Filter className="h-3 w-3" /> Advanced
        </button>
      </div>

      {isFetching && (
        <p className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
          Loading campaigns…
        </p>
      )}

      {!isFetching && campaigns.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create a campaign, assign leads, and let the AI dial through your calling window."
          action={
            <button
              onClick={() => setBuilderOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Create your first campaign
            </button>
          }
        />
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {campaigns.map((c: any) => (
          <div
            key={c.id}
            className="glass rounded-xl p-5 transition-all hover:border-primary/40"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-base font-semibold text-foreground">
                  {c.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {c.lead_count ?? 0} leads · {c.rate_limit_per_min ?? "—"}/min ·{" "}
                  {(c.calling_window_start || "").slice(0, 5)}–
                  {(c.calling_window_end || "").slice(0, 5)}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(c.status === "draft" || c.status === "paused") && (
                <button
                  onClick={() => start(c.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/15 px-2.5 py-1.5 text-xs font-medium text-success hover:bg-success/25"
                >
                  <Play className="h-3.5 w-3.5" /> Start
                </button>
              )}
              {c.status === "running" && (
                <button
                  onClick={() => pause(c.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/15 px-2.5 py-1.5 text-xs font-medium text-warning hover:bg-warning/25"
                >
                  <Pause className="h-3.5 w-3.5" /> Pause
                </button>
              )}
              {c.status !== "stopped" && c.status !== "completed" && (
                <button
                  onClick={() => stop(c.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
                >
                  <Square className="h-3.5 w-3.5" /> Stop
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {builderOpen && <CampaignBuilder onClose={() => setBuilderOpen(false)} />}
    </div>
  );
}

const DEFAULT_PROMPT =
  "You are a helpful AI sales assistant. Greet the customer, introduce yourself, and qualify their interest in under two minutes. Sound natural, friendly, and confident.";

function CampaignBuilder({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    system_prompt: DEFAULT_PROMPT,
    calling_window_start: "09:00:00",
    calling_window_end: "18:00:00",
    rate_limit_per_min: 5,
  });
  const [create, { isLoading, error }] = useCreateCampaignMutation();
  const [addLeads, { isLoading: addingLeads }] = useAddLeadsToCampaignMutation();

  // --- Lead selection ---
  const [leadMode, setLeadMode] = useState<"all" | "select">("all");
  const [leadSearch, setLeadSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [leadError, setLeadError] = useState("");
  const { data: leadData, isFetching: leadsLoading } = useGetLeadsQuery({
    search: leadSearch,
  });
  const leads: any[] = leadData?.results || leadData || [];
  const leadCount: number = leadData?.count ?? leads.length;

  function toggleLead(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLeadError("");
    // A campaign with no leads has nothing to dial — require a selection.
    if (leadMode === "select" && selected.size === 0) {
      setLeadError("Pick at least one lead, or switch to “Add all leads”.");
      return;
    }
    if (leadMode === "all" && leadCount === 0) {
      setLeadError("There are no leads to add yet. Upload leads first.");
      return;
    }
    try {
      const campaign = await create(form).unwrap();
      if (leadMode === "all") {
        await addLeads({ id: campaign.id, all: true, search: leadSearch || undefined }).unwrap();
      } else {
        await addLeads({ id: campaign.id, lead_ids: [...selected] }).unwrap();
      }
      onClose();
    } catch {}
  }

  const submitting = isLoading || addingLeads;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border/60 bg-surface shadow-2xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              New campaign
            </p>
            <h2 className="truncate font-display text-lg font-semibold text-foreground">
              Configure your dialer
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 space-y-5 p-5">
          <Field label="Campaign name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="June Outreach"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Window start">
              <input
                type="time"
                value={form.calling_window_start.slice(0, 5)}
                onChange={(e) =>
                  setForm({ ...form, calling_window_start: e.target.value + ":00" })
                }
                className={inputClass}
              />
            </Field>
            <Field label="Window end">
              <input
                type="time"
                value={form.calling_window_end.slice(0, 5)}
                onChange={(e) =>
                  setForm({ ...form, calling_window_end: e.target.value + ":00" })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Rate limit (calls / minute)">
            <input
              type="number"
              min={1}
              max={60}
              value={form.rate_limit_per_min}
              onChange={(e) =>
                setForm({ ...form, rate_limit_per_min: parseInt(e.target.value) || 1 })
              }
              className={`${inputClass} w-32`}
            />
          </Field>

          <Field label="Leads to call">
            {/* Mode toggle: every lead, or a hand-picked subset. */}
            <div className="mb-3 inline-flex rounded-lg border border-border p-0.5">
              <button
                type="button"
                onClick={() => setLeadMode("all")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  leadMode === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Add all leads
              </button>
              <button
                type="button"
                onClick={() => setLeadMode("select")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  leadMode === "select"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pick specific leads
              </button>
            </div>

            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                placeholder="Search leads by name, phone, company, email…"
                className={`${inputClass} pl-9`}
              />
            </div>

            {leadCount === 0 && !leadsLoading ? (
              <div className="rounded-lg border border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
                No leads found.{" "}
                <Link to="/leads" className="font-medium text-primary hover:underline">
                  Upload leads first
                </Link>{" "}
                to start a campaign.
              </div>
            ) : leadMode === "all" ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>
                  All <span className="font-semibold">{leadCount}</span>
                  {leadSearch ? " matching" : ""} lead{leadCount === 1 ? "" : "s"} will be added to
                  this campaign.
                </span>
              </div>
            ) : (
              <div>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-border">
                  {leadsLoading ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">Loading…</p>
                  ) : (
                    leads.map((l) => (
                      <label
                        key={l.id}
                        className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-3 py-2 text-sm last:border-0 hover:bg-accent/40"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(l.id)}
                          onChange={() => toggleLead(l.id)}
                          className="h-3.5 w-3.5 rounded border-border accent-primary"
                        />
                        <span className="min-w-0 flex-1 truncate text-foreground">
                          {l.name || "Unnamed lead"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {l.phone}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {selected.size} selected
                  {leadCount > leads.length && (
                    <> · showing first {leads.length} of {leadCount} — search to narrow</>
                  )}
                </p>
              </div>
            )}
            {!!leadError && (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {leadError}
              </p>
            )}
          </Field>

          <Field label="AI system prompt / script">
            <textarea
              rows={8}
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              className={`${inputClass} font-mono text-xs leading-relaxed`}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Sent as the system prompt to GPT-4o for every call in this campaign.
            </p>
          </Field>

          {!!error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Failed to create campaign — check your API connection.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create campaign"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
