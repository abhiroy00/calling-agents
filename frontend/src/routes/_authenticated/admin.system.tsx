import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Megaphone,
  PhoneCall,
  CalendarClock,
  UserCheck,
  Search as SearchIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/PageHeader";
import Forbidden from "@/components/Forbidden";
import { cn } from "@/lib/utils";
import { useIsManager, useRole } from "@/features/admin/adminAccess";
import { useGetSystemHealthQuery, type SystemHealth } from "@/features/admin/adminApi";

export const Route = createFileRoute("/_authenticated/admin/system")({
  head: () => ({
    meta: [
      { title: "System health — LeadGen+ Admin" },
      { name: "description", content: "Platform status, service registry, and live counts." },
    ],
  }),
  component: SystemPage,
});

const statusStyles: Record<
  SystemHealth["services"][number]["status"],
  { cls: string; Icon: typeof CheckCircle2; label: string }
> = {
  operational: {
    cls: "border-success/25 bg-success/10 text-success",
    Icon: CheckCircle2,
    label: "Operational",
  },
  degraded: {
    cls: "border-warning/25 bg-warning/10 text-warning-foreground",
    Icon: AlertTriangle,
    label: "Degraded",
  },
  down: {
    cls: "border-destructive/25 bg-destructive/10 text-destructive",
    Icon: XCircle,
    label: "Down",
  },
};

function SystemPage() {
  const isManager = useIsManager();
  const role = useRole();
  const { data, isLoading, isFetching, refetch } = useGetSystemHealthQuery(undefined, {
    skip: !isManager,
  });

  if (!isManager) {
    return <Forbidden page="System health" role={role} allowedRoles={["super_admin", "manager"]} />;
  }

  const counts = data?.counts;
  const services = data?.services ?? [];
  const operational = services.filter((s) => s.status === "operational").length;

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="System health"
        subtitle={
          data
            ? `${operational}/${services.length} services operational`
            : "Loading platform status…"
        }
        actions={
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[12.5px] font-semibold hover:border-primary/40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} /> Refresh
          </button>
        }
      />

      {isLoading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Users" value={counts?.users ?? 0} icon={Users} />
            <StatCard
              label="Active users"
              value={counts?.active_users ?? 0}
              icon={UserCheck}
              accent="success"
            />
            <StatCard
              label="Leads"
              value={(counts?.leads ?? 0).toLocaleString()}
              icon={SearchIcon}
            />
            <StatCard label="Campaigns" value={counts?.campaigns ?? 0} icon={Megaphone} />
            <StatCard
              label="Calls"
              value={(counts?.calls ?? 0).toLocaleString()}
              icon={PhoneCall}
            />
            <StatCard
              label="Meetings"
              value={counts?.meetings ?? 0}
              icon={CalendarClock}
              accent="primary"
            />
          </div>

          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3.5 w-3.5" /> Service registry
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {services.map((s) => {
              const st = statusStyles[s.status];
              return (
                <div key={s.name} className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        st.cls,
                      )}
                    >
                      <st.Icon className="h-3 w-3" /> {st.label}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[11.5px] text-muted-foreground">{s.detail}</p>
                </div>
              );
            })}
          </div>

          {data && (
            <p className="mt-4 text-[11px] text-muted-foreground">
              Last updated {new Date(data.generated_at).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}
