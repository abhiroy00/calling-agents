import { createFileRoute, Link } from "@tanstack/react-router";
import { useSelector, useDispatch } from "react-redux";
import { Check, CreditCard, Download, Sparkles, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";
import type { RootState } from "@/app/store";
import {
  setPlan,
  selectMinutesRemaining,
  selectLeadsRemaining,
  selectMinutesPct,
  type PlanTier,
} from "@/features/billing/billingSlice";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Usage — LeadGen+" },
      { name: "description", content: "Manage your plan, usage, and invoices." },
    ],
  }),
  component: BillingPage,
});

type PlanDef = {
  id: PlanTier;
  name: string;
  price: string;
  minutes: number;
  leads: number;
  perks: string[];
};

const PLANS: PlanDef[] = [
  { id: "starter", name: "Starter", price: "₹2,999/mo", minutes: 500, leads: 2000, perks: ["1 seat", "Email support"] },
  { id: "growth", name: "Growth", price: "₹9,999/mo", minutes: 2500, leads: 10000, perks: ["5 seats", "Live board", "Priority support"] },
  { id: "scale", name: "Scale", price: "₹29,999/mo", minutes: 10000, leads: 50000, perks: ["Unlimited seats", "SSO", "99.9% SLA"] },
];

// Placeholder invoices — replace with GET /api/billing/invoices when backend ships.
const INVOICES = [
  { id: "INV-2026-07", date: "Jul 1, 2026", amount: "₹9,999", status: "Paid" },
  { id: "INV-2026-06", date: "Jun 1, 2026", amount: "₹9,999", status: "Paid" },
  { id: "INV-2026-05", date: "May 1, 2026", amount: "₹9,999", status: "Paid" },
];

function BillingPage() {
  const dispatch = useDispatch();
  const billing = useSelector((s: RootState) => s.billing);
  const minutesLeft = useSelector(selectMinutesRemaining);
  const leadsLeft = useSelector(selectLeadsRemaining);
  const minutesPct = useSelector(selectMinutesPct);
  const leadsPct = Math.min(100, (billing.leadsUsed / Math.max(1, billing.leadsQuota)) * 100);

  function upgrade(plan: PlanDef) {
    // TODO: kick off checkout when payments are enabled.
    dispatch(setPlan({ plan: plan.id, minutesQuota: plan.minutes, leadsQuota: plan.leads }));
    toast.success(`Plan updated to ${plan.name}`);
  }

  const planLabel =
    billing.plan === "trial" ? "Free trial" : PLANS.find((p) => p.id === billing.plan)?.name ?? billing.plan;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Billing</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Plan & usage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Current plan: <span className="font-medium text-foreground">{planLabel}</span> · Renews{" "}
            {new Date(billing.renewsAt).toLocaleDateString()}
          </p>
        </div>
        {billing.plan === "trial" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> 100 free minutes active
          </span>
        )}
      </div>

      {/* Usage cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <UsageCard
          icon={Zap}
          label="AI call minutes"
          used={billing.minutesUsed}
          quota={billing.minutesQuota}
          pct={minutesPct}
          remaining={minutesLeft}
          unit="min"
        />
        <UsageCard
          icon={TrendingUp}
          label="Leads dialed"
          used={billing.leadsUsed}
          quota={billing.leadsQuota}
          pct={leadsPct}
          remaining={leadsLeft}
          unit="leads"
        />
      </div>

      {/* Plans */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Upgrade or change plan</h2>
            <p className="text-sm text-muted-foreground">Overage billed at ₹2/min. Cancel anytime.</p>
          </div>
          <Link to="/" className="text-xs text-primary hover:underline">
            See full pricing →
          </Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => {
            const current = billing.plan === p.id;
            return (
              <div
                key={p.id}
                className={
                  "flex flex-col rounded-xl border p-5 shadow-sm " +
                  (current ? "border-primary ring-2 ring-primary/20" : "border-border bg-card")
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold">{p.name}</h3>
                  {current && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-1 font-display text-2xl font-bold">{p.price}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {p.minutes.toLocaleString()} minutes / mo
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {p.leads.toLocaleString()} leads / mo
                  </li>
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      {perk}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => upgrade(p)}
                  disabled={current}
                  className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  {current ? "Current plan" : "Switch to " + p.name}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Invoices */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Invoices</h2>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Invoice</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {INVOICES.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-2.5 font-medium">{inv.id}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{inv.date}</td>
                  <td className="px-4 py-2.5 tabular">{inv.amount}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Download className="h-3 w-3" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Invoices are illustrative until payments are enabled on this workspace.
        </p>
      </section>
    </div>
  );
}

function UsageCard({
  icon: Icon,
  label,
  used,
  quota,
  pct,
  remaining,
  unit,
}: {
  icon: typeof Zap;
  label: string;
  used: number;
  quota: number;
  pct: number;
  remaining: number;
  unit: string;
}) {
  const over = pct >= 100;
  const warn = pct >= 80 && !over;
  const barColor = over ? "bg-destructive" : warn ? "bg-warning" : "bg-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium">{label}</p>
        </div>
        <p className="tabular text-xs text-muted-foreground">
          {used.toLocaleString()} / {quota.toLocaleString()} {unit}
        </p>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={"h-full rounded-full transition-all " + barColor} style={{ width: pct + "%" }} />
      </div>
      <p className={"mt-2 text-xs " + (over ? "text-destructive" : "text-muted-foreground")}>
        {over
          ? `Quota exceeded — upgrade to keep dialing.`
          : `${remaining.toLocaleString()} ${unit} remaining this cycle.`}
      </p>
    </div>
  );
}
