import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Upload,
  Search,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Download,
  Phone,
  Building2,
  Mail,
  UserPlus,
  HelpCircle,
  FileText,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useBulkUploadMutation, useGetLeadsQuery } from "@/features/leads/leadsApi";
import {
  parseFile,
  validateRows,
  downloadLeadTemplate,
  exportLeadsToCsv,
  TEMPLATE_HEADERS,
  type ValidatedRows,
} from "@/features/leads/leadUtils";
import { PageHeader, Chip, EmptyState } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";


function Avatar({ name }: { name?: string | null }) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
  // deterministic tint from name
  const palette = [
    "bg-primary/12 text-primary",
    "bg-success/12 text-success",
    "bg-warning/15 text-warning",
    "bg-info/15 text-info",
    "bg-accent text-accent-foreground",
  ];
  let hash = 0;
  for (const c of name || "") hash = (hash * 31 + c.charCodeAt(0)) | 0;
  const cls = palette[Math.abs(hash) % palette.length];
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${cls}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="px-3 py-2.5 text-left font-semibold">
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 transition-colors hover:bg-muted/70 hover:text-foreground ${
          active ? "text-foreground" : ""
        }`}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <Icon className={`h-3 w-3 ${active ? "text-primary" : "opacity-60"}`} />
      </button>
    </th>
  );
}

function PagerButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
    >
      {children}
    </button>
  );
}





export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — LeadGen+" },
      { name: "description", content: "Manage and upload leads for calling campaigns." },
    ],
  }),
  component: LeadsPage,
});

const SCHEMA_FIELDS = ["phone", "name", "company", "email", "__ignore__"] as const;

type SortKey = "name" | "company" | "phone" | "status" | "created_at";
type SortDir = "asc" | "desc";
type FilterVal = "all" | "new" | "called" | "uncontacted";

// Lead.status values that count as "already contacted" vs "not yet contacted".
const CONTACTED = new Set(["called", "interested", "not_interested", "callback"]);
const UNCONTACTED = new Set(["new", "queued"]);

function matchesFilter(lead: any, f: FilterVal): boolean {
  const s = lead.status || "new";
  if (f === "all") return true;
  if (f === "new") return s === "new";
  if (f === "called") return CONTACTED.has(s);
  return UNCONTACTED.has(s); // uncontacted
}

function LeadsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterVal>("all");
  const { data, isFetching } = useGetLeadsQuery({ search });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const allLeads = data?.results || [];
  const totalCount = data?.count ?? allLeads.length ?? 0;

  const statusCounts = useMemo(
    () => ({
      new: allLeads.filter((l: any) => (l.status || "new") === "new").length,
      called: allLeads.filter((l: any) => CONTACTED.has(l.status)).length,
      uncontacted: allLeads.filter((l: any) => UNCONTACTED.has(l.status || "new")).length,
    }),
    [allLeads],
  );

  const filteredLeads = useMemo(
    () => allLeads.filter((l: any) => matchesFilter(l, filter)),
    [allLeads, filter],
  );

  const sortedLeads = useMemo(() => {
    const arr = [...filteredLeads];
    arr.sort((a: any, b: any) => {
      const av = a?.[sortKey];
      const bv = b?.[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (sortKey === "created_at") {
        const at = new Date(av).getTime();
        const bt = new Date(bv).getTime();
        return sortDir === "asc" ? at - bt : bt - at;
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: "base", numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredLeads, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const leads = sortedLeads.slice(pageStart, pageStart + pageSize);
  const rangeStart = sortedLeads.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + pageSize, sortedLeads.length);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
    setPage(1);
  }

  function changeFilter(f: FilterVal) {
    setFilter(f);
    setPage(1);
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Select-all toggles every lead on the current page.
  const pageAllSelected = leads.length > 0 && leads.every((l: any) => selected.has(l.id));
  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) leads.forEach((l: any) => next.delete(l.id));
      else leads.forEach((l: any) => next.add(l.id));
      return next;
    });
  }

  // Export selected leads if any are ticked, otherwise the current filtered view.
  function handleExport() {
    const rows = selected.size
      ? allLeads.filter((l: any) => selected.has(l.id))
      : sortedLeads;
    if (rows.length) exportLeadsToCsv(rows);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="People"
        title="Leads"
        subtitle={`${totalCount} contacts in your workspace`}
        tabs={[
          { label: "All leads", value: "all", count: totalCount },
          { label: "New", value: "new", count: statusCounts.new },
          { label: "Called", value: "called", count: statusCounts.called },
          { label: "Uncontacted", value: "uncontacted", count: statusCounts.uncontacted },
        ]}
        activeTab={filter}
        onTabChange={(v) => changeFilter(v as FilterVal)}
        actions={
          <>
            <button
              onClick={handleExport}
              disabled={totalCount === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              {selected.size ? `Export (${selected.size})` : "Export"}
            </button>
            <button
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:text-sm"
            >
              <Upload className="h-4 w-4" />
              Upload leads
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-card)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search by name, phone, company, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-transparent bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip label="All" active={filter === "all"} onClick={() => changeFilter("all")} />
          <Chip label="New" active={filter === "new"} onClick={() => changeFilter("new")} />
          <Chip label="Called" active={filter === "called"} onClick={() => changeFilter("called")} />
          <Chip
            label="Not called"
            active={filter === "uncontacted"}
            onClick={() => changeFilter("uncontacted")}
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] md:block">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[11px] text-muted-foreground">
          <span>
            {sortedLeads.length === 0 ? (
              <>No results</>
            ) : (
              <>
                Showing <span className="font-semibold text-foreground tabular">{rangeStart}</span>–
                <span className="font-semibold text-foreground tabular">{rangeEnd}</span> of{" "}
                <span className="tabular">{sortedLeads.length}</span>
              </>
            )}
          </span>
          {selected.size > 0 ? (
            <span className="inline-flex items-center gap-2">
              <span className="font-medium text-foreground">{selected.size} selected</span>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
              >
                <Download className="h-3 w-3" /> Export
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Live sync
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-2.5 text-left">
                  <input
                    type="checkbox"
                    checked={pageAllSelected}
                    onChange={toggleAllOnPage}
                    className="h-3.5 w-3.5 rounded border-border accent-primary"
                    aria-label="Select all"
                  />
                </th>
                <SortableTh label="Contact" k="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Company" k="company" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Phone" k="phone" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Added" k="created_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {isFetching && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-muted-foreground">
                    Loading leads…
                  </td>
                </tr>
              )}
              {!isFetching && leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={UserPlus}
                      title="Add your first lead"
                      description="Import contacts from a CSV or Excel file to start calling, tracking, and converting them."
                      action={
                        <div className="flex flex-col items-center gap-3">
                          <button
                            onClick={() => setUploadOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Upload your first list
                          </button>
                          <button
                            onClick={() => setHelpOpen(true)}
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-primary"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                            How to prepare your import file
                          </button>
                        </div>
                      }
                    />
                  </td>
                </tr>
              )}
              {leads.map((lead: any) => (
                <tr
                  key={lead.id}
                  className="group border-t border-border/70 transition-colors hover:bg-accent/40"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                      className="h-3.5 w-3.5 rounded border-border accent-primary"
                      aria-label={`Select ${lead.name || lead.phone}`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={lead.name || lead.phone} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {lead.name || "Unnamed lead"}
                        </p>
                        {lead.email && (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {lead.company ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground">
                        <span className="grid h-6 w-6 place-items-center rounded-md bg-muted text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                        </span>
                        <span className="truncate">{lead.company}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular text-foreground">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      {lead.phone}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={lead.status || "new"} />
                  </td>
                  <td className="px-3 py-3 text-[12px] text-muted-foreground tabular">
                    {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedLeads.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-[11.5px] text-muted-foreground sm:flex-row">
            <div className="flex items-center gap-2">
              <label htmlFor="lead-page-size" className="text-muted-foreground">
                Rows per page
              </label>
              <select
                id="lead-page-size"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="hidden sm:inline">·</span>
              <span className="tabular">
                Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPages}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <PagerButton
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                label="First page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </PagerButton>
              <PagerButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </PagerButton>
              <PagerButton
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </PagerButton>
              <PagerButton
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                label="Last page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </PagerButton>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2.5 md:hidden">
        {isFetching && (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-card)]">
            Loading…
          </p>
        )}
        {!isFetching && leads.length === 0 && (
          <EmptyState
            icon={UserPlus}
            title="Add your first lead"
            description="Import contacts from a CSV or Excel file to start calling, tracking, and converting them."
            action={
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload your first list
                </button>
                <button
                  onClick={() => setHelpOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  How to prepare your import file
                </button>
              </div>
            }
          />
        )}
        {leads.map((lead: any) => (
          <div
            key={lead.id}
            className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
          >
            <div className="flex items-start gap-3">
              <Avatar name={lead.name || lead.phone} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-foreground">
                    {lead.name || "Unnamed lead"}
                  </p>
                  <StatusBadge status={lead.status || "new"} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-xs tabular text-muted-foreground">
                  <Phone className="h-3 w-3" /> {lead.phone}
                </p>
                {lead.company && (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {lead.company}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>


      {uploadOpen && <UploadDrawer onClose={() => setUploadOpen(false)} />}
      {helpOpen && <HelpDrawer onClose={() => setHelpOpen(false)} onStartUpload={() => { setHelpOpen(false); setUploadOpen(true); }} />}
    </div>
  );
}

function UploadDrawer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"pick" | "map" | "preview" | "done">("pick");
  const [parsed, setParsed] = useState<{ headers: string[]; rows: any[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ValidatedRows | null>(null);
  const [result, setResult] = useState<{ created: number; duplicates: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [bulkUpload, { isLoading }] = useBulkUploadMutation();

  async function handleFile(f?: File | null) {
    if (!f) return;
    const result = await parseFile(f);
    setParsed(result);
    const m: Record<string, string> = {};
    result.headers.forEach((h) => {
      const l = h.toLowerCase();
      if (l.includes("phone") || l.includes("mobile") || l.includes("cell")) m[h] = "phone";
      else if (l.includes("name")) m[h] = "name";
      else if (l.includes("company") || l.includes("org")) m[h] = "company";
      else if (l.includes("email")) m[h] = "email";
      else m[h] = "__ignore__";
    });
    setMapping(m);
    setStep("map");
  }

  function buildLeadMapping() {
    const leadMapping: Record<string, string> = {};
    for (const [col, field] of Object.entries(mapping)) {
      if (field !== "__ignore__") leadMapping[field] = col;
    }
    return leadMapping;
  }

  function goPreview() {
    const lm = buildLeadMapping();
    if (!lm.phone) return alert('Map at least one column to "phone"');
    setPreview(validateRows(parsed!.rows, lm));
    setStep("preview");
  }

  async function doImport() {
    if (!preview) return;
    try {
      const res = await bulkUpload(preview.valid).unwrap();
      setResult(res);
      setStep("done");
    } catch (e) {
      alert("Upload failed. Check your API connection.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border/60 bg-surface shadow-2xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Step {step === "pick" ? 1 : step === "map" ? 2 : step === "preview" ? 3 : 4} of 4
            </p>
            <h2 className="truncate font-display text-lg font-semibold text-foreground">
              {step === "pick"
                ? "Upload leads"
                : step === "map"
                  ? "Map columns"
                  : step === "preview"
                    ? "Review & import"
                    : "Import complete"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 p-5">
          {step === "pick" && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className={`grid cursor-pointer place-items-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragging
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
              >
                <FileSpreadsheet className="mb-3 h-10 w-10 text-primary" />
                <p className="text-sm text-foreground">
                  Drag & drop CSV / Excel or <span className="text-primary">browse</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">.csv, .xlsx, .xls accepted</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              {/* Template helper: shows the expected columns and offers a sample file. */}
              <div className="mt-4 rounded-xl border border-border bg-card/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">
                      Not sure about the format?
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                      Download our template to see exactly how your import file should look.
                      Only <span className="font-medium text-foreground">phone</span> is required —
                      any extra columns are saved as custom lead data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadLeadTemplate();
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Template
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {TEMPLATE_HEADERS.map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {col}
                      {col === "phone" && <span className="text-primary">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "map" && parsed && (
            <div>
              <p className="mb-4 text-xs text-muted-foreground">
                Match your file headers to the CRM schema.
              </p>
              <div className="space-y-2">
                {parsed.headers.map((h) => (
                  <div
                    key={h}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-muted-foreground">"{h}"</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={mapping[h]}
                      onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      {SCHEMA_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {f === "__ignore__" ? "ignore" : f}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "preview" && preview && (
            <div>
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-success/30 bg-success/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Valid
                  </p>
                  <p className="tabular font-display text-2xl font-bold text-success">
                    {preview.valid.length}
                  </p>
                </div>
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Duplicates
                  </p>
                  <p className="tabular font-display text-2xl font-bold text-warning">
                    {preview.dupeCount}
                  </p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Invalid
                  </p>
                  <p className="tabular font-display text-2xl font-bold text-destructive">
                    {preview.invalid.length}
                  </p>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface/60 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Phone</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.valid.slice(0, 6).map((r, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="px-3 py-2 font-mono text-xs">{r.phone}</td>
                        <td className="px-3 py-2">{r.name || "—"}</td>
                        <td className="px-3 py-2">{r.company || "—"}</td>
                      </tr>
                    ))}
                    {preview.valid.length > 6 && (
                      <tr className="border-t border-border/60">
                        <td colSpan={3} className="px-3 py-2 text-center text-xs text-muted-foreground">
                          +{preview.valid.length - 6} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === "done" && result && (
            <div className="grid place-items-center py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
                <Check className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display text-xl font-semibold text-foreground">
                Import complete
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.created} leads created · {result.duplicates} duplicates skipped
              </p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {step === "done" ? "Close" : "Cancel"}
          </button>
          <div className="flex gap-2">
            {step === "map" && (
              <>
                <button
                  onClick={() => setStep("pick")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button
                  onClick={goPreview}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Preview <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {step === "preview" && (
              <>
                <button
                  onClick={() => setStep("map")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button
                  onClick={doImport}
                  disabled={isLoading || preview!.valid.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoading ? "Importing…" : `Import ${preview!.valid.length}`}
                </button>
              </>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}

function HelpDrawer({ onClose, onStartUpload }: { onClose: () => void; onStartUpload: () => void }) {
  const steps = [
    {
      icon: FileText,
      title: "Prepare your file",
      body: "Use a CSV or Excel (.xlsx) file. Each row should represent one contact.",
    },
    {
      icon: Phone,
      title: "Required: phone number",
      body: "At least one column must contain phone numbers. We accept mobile, landline, and international formats.",
    },
    {
      icon: UserPlus,
      title: "Recommended columns",
      body: "Add name, company, and email to enrich your lead cards and caller context.",
    },
    {
      icon: Upload,
      title: "Upload & map",
      body: "Drop your file, map the headers to our fields, review the preview, and import.",
    },
  ];
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative mx-auto my-auto w-full max-w-lg rounded-2xl border border-border/60 bg-surface p-6 shadow-2xl">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">How to import leads</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              A quick guide to preparing your first upload.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-6 flex items-center justify-between gap-2">
          <button
            onClick={() => downloadLeadTemplate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Download template
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onStartUpload();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Got it, start upload
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
