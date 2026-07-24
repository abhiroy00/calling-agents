import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download, ScrollText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import Forbidden from "@/components/Forbidden";
import { useIsSuperAdmin, useRole } from "@/features/admin/adminAccess";
import { useGetAuditLogQuery } from "@/features/admin/adminApi";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — LeadGen+ Admin" },
      { name: "description", content: "Every privileged action, attributable to a user." },
    ],
  }),
  component: AuditPage,
});

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

function toCsv(
  rows: {
    actor_email: string;
    action: string;
    resource: string;
    ip: string | null;
    created_at: string;
  }[],
): string {
  const head = ["actor", "action", "resource", "ip", "at"];
  const body = rows.map((r) =>
    [r.actor_email, r.action, r.resource, r.ip ?? "", r.created_at]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [head.join(","), ...body].join("\n");
}

function AuditPage() {
  const isSuperAdmin = useIsSuperAdmin();
  const role = useRole();
  const { data: entries = [], isLoading } = useGetAuditLogQuery(undefined, { skip: !isSuperAdmin });
  const [q, setQ] = useState("");

  const list = useMemo(
    () =>
      entries.filter((e) =>
        q
          ? [e.actor_email, e.action, e.resource].some((f) =>
              (f ?? "").toLowerCase().includes(q.toLowerCase()),
            )
          : true,
      ),
    [q, entries],
  );

  if (!isSuperAdmin) {
    return <Forbidden page="Audit log" role={role} allowedRoles={["super_admin"]} />;
  }

  const exportCsv = () => {
    const blob = new Blob([toCsv(list)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Audit log"
        subtitle="Every privileged action, attributable to a user."
        actions={
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[12.5px] font-semibold hover:border-primary/40"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        }
      />

      <div className="mb-3 flex max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by actor, action, or resource…"
          className="w-full bg-transparent text-[13px] focus:outline-none"
        />
      </div>

      <div className="glass overflow-hidden rounded-xl">
        <table className="w-full text-[12.5px]">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Resource</th>
              <th className="px-3 py-2 font-medium">IP</th>
              <th className="px-3 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-[11.5px] text-muted-foreground">
                  {e.actor_email || "system"}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground">
                    <ScrollText className="h-3 w-3 text-muted-foreground" /> {e.action}
                  </span>
                </td>
                <td className="px-3 py-2 text-foreground">{e.resource || "—"}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {e.ip ?? "—"}
                </td>
                <td className="px-3 py-2 tabular text-muted-foreground">
                  {formatWhen(e.created_at)}
                </td>
              </tr>
            ))}
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td>
              </tr>
            )}
            {!isLoading && list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No audit events yet. Admin actions will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
