import { useSelector } from "react-redux";
import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import type { RootState } from "@/app/store";
import { selectMinutesPct, selectMinutesRemaining } from "@/features/billing/billingSlice";

export default function UsageBadge() {
  const pct = useSelector(selectMinutesPct);
  const remaining = useSelector(selectMinutesRemaining);
  const plan = useSelector((s: RootState) => s.billing.plan);

  const over = pct >= 100;
  const warn = pct >= 80 && !over;
  const tone = over
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : warn
      ? "border-warning/40 bg-warning/10 text-warning-foreground"
      : "border-border bg-background text-foreground";

  return (
    <Link
      to="/billing"
      className={
        "hidden items-center gap-2 rounded-lg border px-2.5 py-1 transition-colors hover:border-primary/40 md:inline-flex " +
        tone
      }
      title={`${remaining.toLocaleString()} minutes left · ${plan} plan`}
    >
      <Zap className="h-3.5 w-3.5" />
      <span className="tabular text-[11px] font-semibold">
        {over ? "Quota reached" : `${remaining.toLocaleString()} min left`}
      </span>
    </Link>
  );
}
