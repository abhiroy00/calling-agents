import type { ReactNode, ComponentType } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  actions,
  tabs,
  eyebrow,
  activeTab,
  onTabChange,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  tabs?: { label: string; value: string; count?: number }[];
  eyebrow?: string;
  activeTab?: string;
  onTabChange?: (v: string) => void;
}) {
  return (
    <div className="mb-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              {eyebrow}
            </p>
          )}
          <h1 className="truncate font-display text-[22px] font-bold leading-tight tracking-tight text-foreground sm:text-[26px]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {tabs && tabs.length > 0 && (
        <div className="mt-4 flex items-center gap-1 border-b border-border overflow-x-auto">
          {tabs.map((t, i) => (
            <TabButton
              key={t.value}
              label={t.label}
              count={t.count}
              active={activeTab != null ? activeTab === t.value : i === 0}
              onClick={onTabChange ? () => onTabChange(t.value) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative -mb-px inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[13px] font-medium transition-colors",
        active
          ? "border-b-2 border-primary text-foreground"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular",
            active ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-card)]">
      {children}
    </div>
  );
}

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30",
      )}
    >
      {label}
    </button>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon: Icon,
  delta,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "destructive";
  icon?: ComponentType<{ className?: string }>;
  delta?: number;
}) {
  const accentClass =
    accent === "success"
      ? "text-success"
      : accent === "warning"
        ? "text-warning"
        : accent === "destructive"
          ? "text-destructive"
          : accent === "primary"
            ? "text-primary"
            : "text-foreground";
  const iconTile =
    accent === "success"
      ? "bg-success/12 text-success"
      : accent === "warning"
        ? "bg-warning/15 text-warning"
        : accent === "destructive"
          ? "bg-destructive/12 text-destructive"
          : "bg-primary/10 text-primary";
  const deltaUp = (delta ?? 0) >= 0;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span className={cn("grid h-7 w-7 place-items-center rounded-lg", iconTile)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className={cn("mt-3 tabular font-display text-[26px] font-bold leading-none sm:text-3xl", accentClass)}>
        {value}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold",
              deltaUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {deltaUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 p-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 -m-3 rounded-full bg-primary/8 blur-xl" aria-hidden />
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[var(--shadow-card)]">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-5 font-display text-lg font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <p className="truncate text-[13.5px] font-semibold text-foreground">{title}</p>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {right}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
