import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Check, Minus, ShieldCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import Forbidden from "@/components/Forbidden";
import { cn } from "@/lib/utils";
import { useIsManager, useRole } from "@/features/admin/adminAccess";
import { useGetRolesQuery } from "@/features/admin/adminApi";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & access — LeadGen+ Admin" },
      { name: "description", content: "Roles and the permission matrix that governs access." },
    ],
  }),
  component: RolesPage,
});

function RolesPage() {
  const isManager = useIsManager();
  const role = useRole();
  const { data, isLoading } = useGetRolesQuery(undefined, { skip: !isManager });

  if (!isManager) {
    return (
      <Forbidden page="Roles & access" role={role} allowedRoles={["super_admin", "manager"]} />
    );
  }

  const roles = data?.roles ?? [];
  const permissions = data?.permissions ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Roles & access"
        subtitle="The permission matrix enforced by the API. Roles are fixed in the backend."
      />

      {isLoading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {roles.map((r) => (
              <div key={r.key} className="glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <p className="font-semibold text-foreground">{r.label}</p>
                  </div>
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {r.user_count} {r.user_count === 1 ? "user" : "users"}
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
                  {r.description}
                </p>
                <p className="mt-2 font-mono text-[10.5px] text-muted-foreground/70">{r.key}</p>
              </div>
            ))}
          </div>

          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" /> Permission matrix
          </div>
          <div className="glass overflow-x-auto rounded-xl">
            <table className="w-full text-[12.5px]">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Permission</th>
                  {roles.map((r) => (
                    <th key={r.key} className="px-3 py-2 text-center font-medium">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.key} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-[11.5px] text-foreground">{p.key}</td>
                    {roles.map((r) => {
                      const has = p.roles.includes(r.key);
                      return (
                        <td key={r.key} className="px-3 py-2 text-center">
                          <span
                            className={cn(
                              "inline-grid h-5 w-5 place-items-center rounded-md",
                              has
                                ? "bg-success/15 text-success"
                                : "bg-muted text-muted-foreground/50",
                            )}
                          >
                            {has ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
