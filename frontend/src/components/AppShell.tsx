import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Radio,
  PhoneCall,
  History,
  Mic,
  BarChart3,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  Settings,
  HelpCircle,
  Sparkles,
  Plus,
  Rocket,
  CreditCard,
} from "lucide-react";
import { logout } from "@/features/auth/authSlice";
import { resetBilling } from "@/features/billing/billingSlice";
import type { RootState } from "@/app/store";
import { cn } from "@/lib/utils";
import UsageBadge from "@/components/UsageBadge";
import OnboardingModal from "@/components/OnboardingModal";

type NavItem = {
  to: "/dashboard" | "/leads" | "/campaigns" | "/live" | "/dial" | "/history" | "/recordings" | "/analytics" | "/billing";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: string;
};

type NavSection = { label: string; items: NavItem[] };

const navSections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
      { to: "/leads", label: "Search", icon: Users },
      { to: "/campaigns", label: "Sequences", icon: Megaphone },
    ],
  },
  {
    label: "Engage",
    items: [
      { to: "/live", label: "Live board", icon: Radio, badge: "LIVE" },
      { to: "/dial", label: "Dialer", icon: PhoneCall },
      { to: "/history", label: "Conversations", icon: History },
      { to: "/recordings", label: "Recordings", icon: Mic },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

const flatNav = navSections.flatMap((s) => s.items);

function SidebarInner({ onNav }: { onNav?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary-foreground shadow-sm"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Rocket className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="text-[15px] font-semibold tracking-tight text-foreground">
            LeadGenAI<span className="text-primary">.</span>+
          </p>
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Sales Engagement
          </p>
        </div>
      </div>

      {/* Workspace switcher */}
      <div className="mx-3 mb-3">
        <button className="flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-background px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-sidebar-accent">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary">
            AC
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-foreground">InnovativeAI Solutions</p>
            <p className="truncate text-[10px] text-muted-foreground">Growth · 42 seats</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Create button */}
      <div className="mx-3 mb-3">
        <button
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-px"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Create new
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon, exact, badge }) => {
                const active = exact ? pathname === to : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={onNav}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors",
                        active
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    <span className="truncate">{label}</span>
                    {badge && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-px text-[9px] font-semibold tracking-wider text-destructive">
                        <span className="h-1 w-1 rounded-full bg-destructive pulse-dot" />
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Upgrade card */}
      <div className="mx-3 mb-3 rounded-lg border border-primary/25 bg-accent p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold text-foreground">Unlock AI credits</p>
        </div>
        <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground">
          Add pooled minutes & unlimited transcripts to your workspace.
        </p>
        <button className="mt-2 w-full rounded-md bg-primary px-2 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          Upgrade plan
        </button>
      </div>

      {/* Footer */}
      <div className="space-y-0.5 border-t border-sidebar-border px-3 py-2.5">
        <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          <span>Help center</span>
        </button>
        <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60">
          <Settings className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useSelector((s: RootState) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = flatNav.find((n) =>
    n.exact ? pathname === n.to : pathname.startsWith(n.to),
  );

  function handleLogout() {
    dispatch(logout());
    dispatch(resetBilling());
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <OnboardingModal />
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarInner />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 shadow-2xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarInner onNav={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>InnovativeAI SOlutions</span>
                  <span className="text-border">/</span>
                  <span className="font-medium text-foreground/80">
                    {current?.label ?? "Console"}
                  </span>
                </div>
                <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                  {current?.label ?? "Console"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
              {/* Search */}
              <div className="hidden items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-muted-foreground transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 md:flex md:w-80">
                <Search className="h-3.5 w-3.5" />
                <input
                  type="text"
                  placeholder="Search people, companies, calls…"
                  className="w-full bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
                  ⌘K
                </kbd>
              </div>

              {/* Usage badge */}
              <UsageBadge />

              {/* Agent status */}
              <div className="hidden items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 lg:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" />
                <span className="text-[11px] font-semibold text-success">Live</span>
              </div>

              {/* Notifications */}
              <button
                className="relative grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-background" />
              </button>

              {/* User chip */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-1.5 py-1">
                <div
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px] font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden min-w-0 pr-1 sm:block">
                  <p className="max-w-35 truncate text-[12px] font-semibold leading-tight text-foreground">
                    {user?.name || user?.email || "Operator"}
                  </p>
                  <p className="text-[10px] leading-tight text-muted-foreground">Admin · Free</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
