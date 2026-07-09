import { Link } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { PhoneCall, Users, Radio, TrendingUp, ArrowRight } from "lucide-react";
import { useGetSummaryQuery } from "@/features/analytics/analyticsApi";
import { PageHeader, StatCard } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

const PIE_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-primary-glow)",
];

export default function DashboardView({
  title = "Ops Overview",
  subtitle = "Real-time snapshot of dialing, connects, and dispositions.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const { data, isFetching, isError } = useGetSummaryQuery();

  const pieData = data?.dispositions
    ? Object.entries(data.dispositions).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Link
            to="/live"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            Live board <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total calls"
          value={data?.total_calls ?? (isFetching ? "…" : "0")}
          hint="lifetime"
          accent="primary"
          icon={PhoneCall}
          delta={12}
        />
        <StatCard
          label="Connected"
          value={data?.connected ?? (isFetching ? "…" : "0")}
          accent="success"
          icon={Users}
          delta={8}
        />
        <StatCard
          label="Connect rate"
          value={`${Math.round(((data?.connect_rate as number) || 0) * 100)}%`}
          icon={TrendingUp}
          delta={-3}
        />
        <StatCard
          label="Avg duration"
          value={data?.avg_duration != null ? `${data.avg_duration}s` : "—"}
          icon={Radio}
          hint="mean handle time"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass rounded-xl p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Volume</p>
              <h2 className="font-display text-base font-semibold text-foreground">
                Calls per day · last 14
              </h2>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data?.calls_per_day || []}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                stroke="var(--color-border)"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                stroke="var(--color-border)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-5 shadow-[var(--shadow-card)]">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Outcomes</p>
          <h2 className="font-display text-base font-semibold text-foreground">Dispositions</h2>
          {pieData.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {isFetching ? "Loading…" : isError ? "Connect your API to see data" : "No data yet"}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "var(--color-muted-foreground)" }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: PhoneCall, label: "Start a manual dial", to: "/dial" as const },
          { icon: Users, label: "Upload new leads", to: "/leads" as const },
          { icon: Radio, label: "Open live board", to: "/live" as const },
        ].map(({ icon: Icon, label, to }) => (
          <Link
            key={to}
            to={to}
            className="group glass flex items-center justify-between rounded-xl p-4 transition-all hover:border-primary/40 hover:glow-ring"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary transition-transform group-hover:scale-105">
                <Icon className="h-4 w-4" />
              </div>
              <span className="truncate text-sm font-medium text-foreground">{label}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      {isError && (
        <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs text-warning">
          Analytics API unreachable. Set <code className="font-mono">VITE_API_URL</code> in{" "}
          <code className="font-mono">.env</code> and reload.
        </div>
      )}

      <div className="mt-8">
        <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">Legend</p>
        <div className="flex flex-wrap gap-2">
          {[
            "running",
            "queued",
            "in_progress",
            "callback",
            "interested",
            "not_interested",
            "voicemail",
          ].map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
