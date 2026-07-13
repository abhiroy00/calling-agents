import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  Rocket,
  PhoneCall,
  BarChart3,
  Radio,
  Check,
  ArrowRight,
  Zap,
  ShieldCheck,
  Users,
  Play,
  Star,
  Sparkles,
  Waves,
  Menu,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { RootState } from "@/app/store";

export const Route = createFileRoute("/")({
  ssr: true,
  head: () => ({
    meta: [
      { title: "LeadGen+ — AI Outbound Calling for Indian SMBs" },
      {
        name: "description",
        content:
          "Launch AI voice agents that dial, qualify, and book callbacks for your sales team. Per-minute pricing, no setup fees, DPDP-compliant.",
      },
      { property: "og:title", content: "LeadGen+ — AI Outbound Calling" },
      {
        property: "og:description",
        content: "AI voice agents that dial your leads and book callbacks — priced per minute.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

const tiers = [
  {
    name: "Starter",
    price: "₹2,999",
    cadence: "/ month",
    tagline: "For solo founders testing outbound.",
    features: [
      "500 AI call minutes / mo",
      "1 seat · 1 campaign",
      "CSV / XLSX lead import",
      "Call recordings + transcripts",
      "Email support",
    ],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹9,999",
    cadence: "/ month",
    tagline: "For growing sales teams.",
    features: [
      "2,500 AI call minutes / mo",
      "5 seats · unlimited campaigns",
      "Live call board + barge-in",
      "CRM webhooks & Zapier",
      "DND / NDNC scrubbing",
      "Priority support",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Scale",
    price: "₹29,999",
    cadence: "/ month",
    tagline: "For high-volume call centers.",
    features: [
      "10,000 AI call minutes / mo",
      "Unlimited seats",
      "Custom voice cloning",
      "Dedicated success manager",
      "SSO + audit logs",
      "99.9% SLA",
    ],
    cta: "Book a demo",
    highlight: false,
  },
];

const stats = [
  ["Avg pickup rate", "34%"],
  ["Callback → meeting", "22%"],
  ["Cost / qualified lead", "₹18"],
  ["Live latency", "142ms"],
];

function LandingPage() {
  const token = useSelector((s: RootState) => s.auth.token);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate({ to: "/dashboard", replace: true });
  }, [token, navigate]);

  if (token) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased">
      <BackgroundFX />
      <div className="relative z-10">
        <Header />
        <Hero />
        <LogoStrip />
        <StatsStrip />
        <Features />
        <ShowcaseBand />
        <Pricing />
        <Testimonials />
        <DemoForm />
        <Footer />
      </div>
    </div>
  );
}

/* ---------- ambient background ---------- */
function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklab, var(--color-primary) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--color-primary) 7%, transparent) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 80% 55% at 50% 0%, black 30%, transparent 75%)",
        }}
      />
      <div
        className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full opacity-[0.35] blur-[140px]"
        style={{ background: "color-mix(in oklab, var(--color-primary) 60%, transparent)" }}
      />
      <div
        className="absolute top-1/3 -right-40 h-[26rem] w-[26rem] rounded-full opacity-[0.22] blur-[140px]"
        style={{ background: "color-mix(in oklab, var(--color-primary-glow) 70%, transparent)" }}
      />
    </div>
  );
}

/* ---------- floating pill header ---------- */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function Header() {
  const reduceMotion = useReducedMotion();
  const [scrolledRaw, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Radix Dialog (used by Sheet) handles body-scroll lock, focus trap, and
  // Escape-to-close on its own. We only need to force-close the sheet on route
  // changes so the panel doesn't linger across navigations.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);


  // When reduced motion is preferred, freeze the pill in its resting (unscrolled)
  // size so it never shrinks/animates on scroll. Only the background/shadow tokens
  // (see below) still swap, and even those transition instantly.
  const scrolled = reduceMotion ? false : scrolledRaw;
  const solid = scrolledRaw; // for opaque bg/shadow after scroll, no size change

  const navLinks: Array<[string, string]> = [
    ["Features", "#features"],
    ["Pricing", "#pricing"],
    ["Live agents", "#showcase"],
    ["Demo", "#demo"],
  ];

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
  const t = (props: string) =>
    reduceMotion
      ? { transitionProperty: "none", transitionDuration: "0ms" }
      : {
          transitionProperty: props,
          transitionDuration: "450ms",
          transitionTimingFunction: ease,
        };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3"
      style={{
        paddingTop: scrolled ? "0.5rem" : "1.25rem",
        ...t("padding-top"),
      }}
    >
      <header
        className="group/nav pointer-events-auto relative flex w-full items-center justify-between rounded-full border backdrop-blur-xl will-change-transform"
        style={{
          maxWidth: scrolled ? "56rem" : "72rem",
          paddingInline: scrolled ? "0.5rem" : "0.625rem",
          paddingBlock: scrolled ? "0.375rem" : "0.5rem",
          gap: scrolled ? "0.5rem" : "0.75rem",
          borderColor: solid
            ? "color-mix(in oklab, var(--color-border) 80%, transparent)"
            : "color-mix(in oklab, var(--color-border) 50%, transparent)",
          background: solid
            ? "color-mix(in oklab, var(--color-background) 82%, transparent)"
            : "color-mix(in oklab, var(--color-background) 60%, transparent)",
          boxShadow: solid
            ? "0 10px 34px -14px color-mix(in oklab, var(--color-primary) 28%, transparent), 0 1px 0 0 color-mix(in oklab, var(--color-foreground) 4%, transparent) inset"
            : "0 0 0 0 transparent",
          transform: scrolled ? "translateY(0) scale(0.985)" : "translateY(0) scale(1)",
          ...t("max-width, padding, gap, border-color, background, box-shadow, transform"),
        }}
      >
        {/* Backlit glow on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-full opacity-0 blur-xl transition-opacity duration-500 group-hover/nav:opacity-100"
          style={{
            background:
              "radial-gradient(60% 120% at 50% 0%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 70%)",
          }}
        />
        <Link to="/" className="relative flex items-center pl-1.5">
          <div
            className="relative grid place-items-center rounded-xl text-primary-foreground"
            style={{
              height: scrolled ? "1.75rem" : "2rem",
              width: scrolled ? "1.75rem" : "2rem",
              background: "var(--gradient-primary)",
              boxShadow: scrolled
                ? "0 4px 14px -4px color-mix(in oklab, var(--color-primary) 55%, transparent)"
                : "0 6px 20px -6px color-mix(in oklab, var(--color-primary) 60%, transparent)",
              ...t("height, width, box-shadow"),
            }}
          >
            <Rocket
              strokeWidth={2.4}
              style={{
                height: scrolled ? "0.85rem" : "1rem",
                width: scrolled ? "0.85rem" : "1rem",
                ...t("height, width"),
              }}
            />
            <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" />
          </div>
          <span
            className="font-semibold tracking-tight"
            style={{
              marginLeft: scrolled ? "0.5rem" : "0.625rem",
              fontSize: scrolled ? "13.5px" : "15px",
              ...t("margin-left, font-size"),
            }}
          >
            LeadGen<span className="gradient-text">+</span>
          </span>
        </Link>
        <nav
          className="relative hidden items-center rounded-full border border-border/40 bg-accent/40 text-sm lg:flex"
          style={{
            gap: "0.125rem",
            padding: "0.25rem",
            ...t("gap, padding"),
          }}
        >
          {navLinks.map(([label, href]) => {
            const isLive = label === "Live agents";
            return (
              <a
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full font-medium text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-[0_1px_0_0_color-mix(in_oklab,var(--color-foreground)_6%,transparent)_inset]"
                style={{
                  paddingInline: scrolled ? "0.75rem" : "0.875rem",
                  paddingBlock: scrolled ? "0.3rem" : "0.375rem",
                  fontSize: scrolled ? "13px" : "14px",
                  ...t("padding, font-size, background-color, color, box-shadow"),
                }}
              >
                {label}
                {isLive && (
                  <span className="relative ml-0.5 flex h-2 w-2" aria-hidden>
                    {!reduceMotion && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <div
          className="relative hidden items-center lg:flex"
          style={{ gap: scrolled ? "0.25rem" : "0.375rem", ...t("gap") }}
        >
          <Link
            to="/login"
            className="rounded-full font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            style={{
              paddingInline: scrolled ? "0.75rem" : "0.875rem",
              paddingBlock: scrolled ? "0.3rem" : "0.375rem",
              fontSize: scrolled ? "13px" : "14px",
              ...t("padding, font-size, background-color, color"),
            }}
          >
            Sign in
          </Link>
          <a
            href="#demo"
            className="group relative inline-flex items-center gap-1.5 rounded-full font-semibold text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-0 active:scale-[0.98]"
            style={{
              background: "var(--gradient-primary)",
              paddingInline: scrolled ? "0.875rem" : "1.05rem",
              paddingBlock: scrolled ? "0.375rem" : "0.5rem",
              fontSize: scrolled ? "13px" : "14px",
              boxShadow: scrolled
                ? "0 6px 18px -6px color-mix(in oklab, var(--color-primary) 75%, transparent), 0 0 0 1px color-mix(in oklab, var(--color-primary) 25%, transparent) inset"
                : "0 10px 28px -10px color-mix(in oklab, var(--color-primary) 85%, transparent), 0 0 0 1px color-mix(in oklab, var(--color-primary) 25%, transparent) inset",
              ...t("padding, font-size, box-shadow, transform"),
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in oklab, white 22%, transparent), transparent 55%)",
              }}
            />
            <span className="relative">Book demo</span>
            <ArrowRight className="relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Mobile hamburger — opens side sheet */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background/70 text-foreground transition-colors hover:bg-accent lg:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-[86%] max-w-sm flex-col gap-0 border-l border-border bg-background p-0"
          >
            <SheetHeader className="border-b border-border p-5 text-left">
              <SheetTitle asChild>
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <span
                    className="relative grid h-8 w-8 place-items-center rounded-xl text-primary-foreground"
                    style={{
                      background: "var(--gradient-primary)",
                      boxShadow:
                        "0 6px 20px -6px color-mix(in oklab, var(--color-primary) 60%, transparent)",
                    }}
                  >
                    <Rocket className="h-4 w-4" strokeWidth={2.4} />
                    <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" />
                  </span>
                  <span className="text-[15px] font-semibold tracking-tight">
                    LeadGen<span className="gradient-text">+</span>
                  </span>
                </Link>
              </SheetTitle>
            </SheetHeader>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {navLinks.map(([label, href]) => {
                const isLive = label === "Live agents";
                return (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <span className="inline-flex items-center gap-2">
                      {label}
                      {isLive && (
                        <span className="relative flex h-2 w-2" aria-hidden>
                          {!reduceMotion && (
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          )}
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                        </span>
                      )}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </a>
                );
              })}
            </nav>

            <div className="flex flex-col gap-2 border-t border-border p-4">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-full border border-border bg-background px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                Sign in
              </Link>
              <a
                href="#demo"
                onClick={() => setMenuOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-10px_color-mix(in_oklab,var(--color-primary)_80%,transparent)]"
                style={{ background: "var(--gradient-primary)" }}
              >
                Book demo
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </SheetContent>
        </Sheet>
      </header>
    </div>

  );
}

/* ---------- hero ---------- */
function Hero() {
  return (
    <section className="relative pt-28 sm:pt-36">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground backdrop-blur sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
            New · Hindi + English voice agents
          </span>
          <h1 className="mt-5 text-[36px] font-bold leading-[1.05] tracking-[-0.03em] sm:mt-6 sm:text-6xl sm:leading-[1.02] lg:text-[84px]">
            Outbound sales,
            <br />
            <span className="relative inline-block">
              <span className="gradient-text">on autopilot.</span>
              <svg
                className="absolute -bottom-2 left-0 h-3 w-full text-primary/70"
                viewBox="0 0 300 12"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M2 8 C 60 2, 120 12, 180 6 S 280 2, 298 8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:mt-7 sm:text-xl sm:leading-normal">
            The AI SDR that dials 10,000 leads before your reps finish their chai.
            Books meetings 24×7 at <span className="font-semibold text-foreground">₹2/minute</span>. Built for Indian SMBs.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#demo"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_color-mix(in_oklab,var(--color-primary)_80%,transparent)] transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--gradient-primary)" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Start dialing free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </a>
            <a
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <Play className="h-4 w-4 fill-current text-primary" />
              Hear a live call
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> 100 free minutes</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-primary" /> Setup in 4 min</span>
          </div>
        </div>

        {/* Console preview — glassmorphic layered dashboard */}
        <ConsoleShowcase />
      </div>
    </section>
  );
}

/* ---------- console showcase (bento glass) ---------- */
function ConsoleShowcase() {
  const queue = [
    { name: "Rahul Sharma", role: "Whitefield 3BHK lead", initials: "RS", state: "Calling now…", live: true },
    { name: "Priya Patel", role: "Term life · Ahmedabad", initials: "PP", state: "In 40 seconds" },
    { name: "Arjun Mehta", role: "EdTech demo · Bengaluru", initials: "AM", state: "In 2 minutes" },
    { name: "Kavya Reddy", role: "IELTS coaching · Hyd", initials: "KR", state: "In 4 minutes" },
  ];
  return (
    <div className="relative mx-auto mt-20 max-w-6xl">
      {/* soft glow behind the frame */}
      <div
        className="absolute -inset-4 rounded-[2.5rem] opacity-40 blur-3xl"
        style={{ background: "var(--gradient-primary)" }}
      />
      <div className="relative flex flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-elevated md:h-[520px] md:flex-row">
        {/* Sidebar — active queue */}
        <aside className="flex w-full flex-col border-b border-border bg-surface/60 md:w-64 md:border-b-0 md:border-r lg:w-72">
          <div className="border-b border-border p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Active queue</p>
            <p className="mt-1 text-sm font-semibold text-foreground">12 contacts remaining today</p>
          </div>
          <div className="space-y-2 p-4 md:flex-1 md:overflow-hidden">

            {queue.map((q) => (
              <div
                key={q.name}
                className={
                  "flex items-center gap-3 rounded-xl border p-3 transition-colors " +
                  (q.live
                    ? "border-primary/30 bg-card shadow-[0_6px_20px_-12px_color-mix(in_oklab,var(--color-primary)_60%,transparent)]"
                    : "border-transparent bg-muted/40 opacity-70")
                }
              >
                <div
                  className={
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold " +
                    (q.live ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")
                  }
                >
                  {q.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-foreground">{q.name}</p>
                  <p className="truncate text-[10.5px] text-muted-foreground">{q.role}</p>
                </div>
                <span
                  className={
                    "shrink-0 text-[10px] font-semibold " +
                    (q.live ? "text-success" : "text-muted-foreground")
                  }
                >
                  {q.live ? (
                    <span className="flex items-center gap-1">
                      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-success" />
                      LIVE
                    </span>
                  ) : (
                    q.state
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Campaign ROI</p>
              <p className="tabular gradient-text mt-1 text-2xl font-bold leading-none">12.4×</p>
              <p className="mt-1 text-[10px] font-semibold text-success">+2.4% vs last week</p>
            </div>
          </div>
        </aside>

        {/* Main — live transcript */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="pulse-dot h-2 w-2 shrink-0 rounded-full bg-destructive" />
              <span className="truncate text-sm font-semibold text-foreground">
                Live transcript · Rahul Sharma
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-md bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                Sentiment · Positive
              </span>
              <span className="hidden rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline-block">
                Agent · Ananya v2
              </span>
            </div>
          </div>


          <div
            className="relative space-y-4 overflow-hidden p-4 sm:p-6 md:flex-1"
            style={{
              backgroundImage:
                "radial-gradient(color-mix(in oklab, var(--color-primary) 12%, transparent) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          >
            <TranscriptBubble who="AI" text="Hi Rahul, this is Ananya from Prestige Realty. You inquired about the Whitefield 3BHK — is now a good time to chat?" />
            <TranscriptBubble who="You" text="Haan, batao. Kya price hai?" mirror />
            <TranscriptBubble who="AI" text="Starting at ₹1.4Cr, possession Dec 2026. Would Saturday 11am work for a site visit?" />

            {/* waveform */}
            <div className="flex items-end justify-center gap-1 pt-6">
              {[10, 18, 26, 14, 30, 22, 36, 20, 28, 16, 24, 32, 14, 22].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full"
                  style={{
                    height: `${h}px`,
                    background: "var(--gradient-primary)",
                    opacity: 0.4 + (i % 4) * 0.15,
                    animation: `wf 1.4s ${i * 80}ms ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
            <style>{`@keyframes wf { 0%,100% { transform: scaleY(0.6);} 50% { transform: scaleY(1.35);} }`}</style>
          </div>
        </div>
      </div>

      {/* Floating status cards */}
      <div className="pointer-events-none absolute -left-3 -bottom-6 hidden items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-4 shadow-elevated backdrop-blur lg:flex">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success">
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Meeting booked</p>
          <p className="text-[12px] font-semibold text-foreground">Priya Patel · Sat 11:00</p>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-3 -top-6 hidden items-center gap-3 rounded-2xl border border-border bg-card p-3 pr-4 shadow-elevated backdrop-blur lg:flex">
        <div
          className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Zap className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Pickup rate</p>
          <p className="text-[12px] font-semibold text-foreground">
            <span className="gradient-text">+34%</span> this month
          </p>
        </div>
      </div>
    </div>
  );
}

function TranscriptBubble({
  who,
  text,
  mirror,
}: {
  who: "AI" | "You";
  text: string;
  mirror?: boolean;
}) {
  return (
    <div className={"flex gap-3 " + (mirror ? "flex-row-reverse" : "")}>
      <div
        className={
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold " +
          (who === "AI"
            ? "bg-foreground text-background"
            : "bg-primary/15 text-primary")
        }
      >
        {who}
      </div>
      <div
        className={
          "max-w-[78%] rounded-2xl border p-3.5 text-[13px] leading-relaxed shadow-sm " +
          (mirror
            ? "rounded-tr-none border-primary/25 text-primary-foreground"
            : "rounded-tl-none border-border bg-card text-foreground/85")
        }
        style={mirror ? { background: "var(--gradient-primary)" } : undefined}
      >
        {text}
      </div>
    </div>
  );
}

/* ---------- logo strip ---------- */
function LogoStrip() {
  const logos = ["PROPTECH.CO", "EDMAX", "SUNRISE INS.", "CODEKUL", "URBANFIT", "MEDIQ", "FLYBOX"];
  return (
    <section className="border-y border-border/70 bg-surface/70">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="text-center text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Powering outbound at 400+ Indian SMBs
        </p>
        <div
          className="mt-5 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div className="flex w-max animate-[logo-scroll_28s_linear_infinite] items-center gap-x-10 sm:gap-x-14">
            {[...logos, ...logos].map((l, i) => (
              <span key={`${l}-${i}`} className="flex shrink-0 items-center gap-x-10 sm:gap-x-14">
                <span className="text-sm font-semibold tracking-widest text-muted-foreground/70 transition-colors hover:text-foreground">
                  {l}
                </span>
                <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-border" />
              </span>
            ))}
          </div>
          <style>{`@keyframes logo-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
        </div>
      </div>
    </section>
  );
}


/* ---------- stats ---------- */
function StatsStrip() {
  return (
    <section>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-16 sm:gap-6 sm:px-6 lg:grid-cols-4">
        {stats.map(([k, v]) => (
          <div
            key={k}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center transition-colors hover:border-primary/40"
          >
            <p className="tabular gradient-text text-[26px] font-bold leading-none sm:text-4xl">{v}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px] sm:tracking-[0.2em]">{k}</p>
            <span className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- features ---------- */
const features = [
  {
    icon: PhoneCall,
    title: "AI voice agents",
    body: "Sub-200ms latency. Trained on your script in minutes. Sounds human enough to fool your own mother.",
  },
  {
    icon: Radio,
    title: "Live call board",
    body: "Every conversation, in real time. Barge in, whisper coaching, or slam the takeover button.",
  },
  {
    icon: BarChart3,
    title: "Analytics & recordings",
    body: "Transcripts, sentiment, outcome tagging, and a firehose of insights. One-click CRM export.",
  },
  {
    icon: ShieldCheck,
    title: "DPDP-ready",
    body: "DND/NDNC scrubbing, recorded consent, and Indian data residency. Sleep at night.",
  },
];

function Features() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-[11px]">
            <Sparkles className="mr-1 inline h-3 w-3" /> The platform
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything LeadGen+ wishes
            <br />
            <span className="gradient-text">they'd shipped.</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
            One console. Every outbound motion. Zero duct tape.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-5 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated sm:p-6"
            >
              <div
                className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground shadow-[0_6px_20px_-8px_color-mix(in_oklab,var(--color-primary)_70%,transparent)] sm:h-11 sm:w-11"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground sm:mt-5 sm:text-lg">{title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">{body}</p>
              <span className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-primary/20 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- showcase band ---------- */
function ShowcaseBand() {
  return (
    <section id="showcase" className="relative">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div
          className="relative overflow-hidden rounded-3xl border border-primary/20 p-6 sm:p-14"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 10%, var(--color-card)) 0%, var(--color-card) 60%, color-mix(in oklab, var(--color-primary-glow) 8%, var(--color-card)) 100%)",
          }}
        >
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-primary-glow/25 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-[11px]">
                Under the hood
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Ten thousand dials.
                <br />
                <span className="gradient-text">One coffee break.</span>
              </h2>
              <p className="mt-4 text-sm text-muted-foreground sm:mt-5 sm:text-base">
                LeadGen+ fires up parallel voice agents on your entire lead list. Warm callbacks
                land in your CRM before you finish reviewing pipeline.
              </p>
              <ul className="mt-5 space-y-2.5 text-[13px] sm:mt-6 sm:text-sm">
                {[
                  "Concurrent AI callers — 1 to 1,000",
                  "Automatic retries on busy / no-answer",
                  "Sentiment-tagged transcripts, delivered live",
                  "Native WhatsApp follow-up after every call",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-foreground/85">
                    <span
                      className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-primary-foreground"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="overflow-x-auto rounded-2xl border border-border bg-[#0d0b18] p-4 font-mono text-[11px] leading-relaxed text-white/80 shadow-2xl sm:p-5 sm:text-[12px]">
                <p className="text-white/40">$ leadgen dial --campaign whitefield-3bhk --list leads.csv</p>
                <p className="mt-2 text-emerald-400">✓ 2,431 numbers scrubbed against DND/NDNC</p>
                <p className="text-emerald-400">✓ 12 agents spun up · avg latency 142ms</p>
                <p className="mt-2 text-[#c4b5fd]">→ Dialing in parallel…</p>
                <p className="text-white/60">  ├─ +91 98•••••210 · <span className="text-emerald-300">BOOKED</span> (Sat 11am)</p>
                <p className="text-white/60">  ├─ +91 99•••••847 · <span className="text-emerald-300">BOOKED</span> (Sun 4pm)</p>
                <p className="text-white/60">  ├─ +91 98•••••112 · <span className="text-white/40">voicemail — retrying</span></p>
                <p className="text-white/60">  └─ +91 90•••••334 · <span className="text-[#ff8fb0]">not interested</span></p>
                <p className="mt-2 text-white">Cost so far: <span className="text-[#f59e0b]">₹184</span> · Meetings: <span className="text-emerald-300">27</span></p>
                <p className="mt-2 flex items-center gap-1 text-[#a78bfa]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#a78bfa]" /> running · press ⌘. to intervene
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- pricing ---------- */
function Pricing() {
  return (
    <section id="pricing" className="relative">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-[11px]">Pricing</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Priced per minute.
            <br />
            <span className="gradient-text">Not per victim.</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Monthly plans include a pool of AI call minutes. Overage at ₹2/min. Cancel any time.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                "group relative flex flex-col overflow-hidden rounded-2xl p-5 transition-all sm:p-7 " +
                (tier.highlight
                  ? "border-2 border-primary/50 bg-card shadow-[0_20px_60px_-20px_color-mix(in_oklab,var(--color-primary)_45%,transparent)] lg:-translate-y-2"
                  : "border border-border bg-card hover:border-primary/30")
              }
            >
              {tier.highlight && (
                <span
                  className="absolute right-4 top-4 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground sm:right-5 sm:top-5 sm:px-2.5 sm:py-1 sm:text-[10px]"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Most popular
                </span>
              )}
              <h3 className="text-base font-semibold text-foreground sm:text-lg">{tier.name}</h3>
              <p className="mt-1 text-[13px] text-muted-foreground sm:text-sm">{tier.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1 sm:mt-6">
                <span className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{tier.price}</span>
                <span className="text-[13px] text-muted-foreground sm:text-sm">{tier.cadence}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 sm:mt-7 sm:space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-foreground/85 sm:text-sm">
                    <span
                      className={
                        "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-primary-foreground " +
                        (tier.highlight ? "" : "bg-muted !text-muted-foreground")
                      }
                      style={tier.highlight ? { background: "var(--gradient-primary)" } : undefined}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#demo"
                className={
                  "mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all " +
                  (tier.highlight
                    ? "text-primary-foreground shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--color-primary)_80%,transparent)] hover:-translate-y-0.5"
                    : "border border-border bg-background text-foreground hover:bg-accent")
                }
                style={tier.highlight ? { background: "var(--gradient-primary)" } : undefined}
              >
                {tier.cta} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- testimonials ---------- */
function Testimonials() {
  const quotes = [
    {
      q: "We booked 340 site visits in our first month. Our human callers used to do 40.",
      a: "Nikhil A.",
      r: "Head of Sales, Prestige Realty",
    },
    {
      q: "The Hindi agent is scary good. Our leads don't realise they're talking to a bot.",
      a: "Priya S.",
      r: "Growth, EdMax",
    },
    {
      q: "₹18 per qualified lead. We were paying ₹340 on Google. It's not a fair fight.",
      a: "Rohit K.",
      r: "Founder, Sunrise Insurance",
    },
  ];
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {quotes.map((t) => (
            <figure
              key={t.a}
              className="relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 sm:p-7"
            >
              <div className="flex gap-0.5 text-warning">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-3 text-[13.5px] leading-relaxed text-foreground/90 sm:mt-4 sm:text-[15px]">"{t.q}"</blockquote>
              <figcaption className="mt-4 flex items-center gap-3 sm:mt-5">
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-primary-foreground sm:h-9 sm:w-9"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {t.a[0]}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{t.a}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{t.r}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- demo form ---------- */
function DemoForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    volume: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) {
      toast.error("Please fill name, email, and company.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setSubmitted(true);
      toast.success("Thanks! We'll reach out within one business day.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="demo" className="relative">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary sm:text-[11px]">Book a demo</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            See it dial your leads.
            <br />
            <span className="gradient-text">Live. On this call.</span>
          </h2>
          <p className="mt-4 text-sm text-muted-foreground sm:mt-5 sm:text-base">
            30-minute demo. We'll spin up an AI agent on your script and dial 5 real numbers from
            your list. You decide if it's ready for production.
          </p>
          <ul className="mt-6 space-y-3 sm:mt-8 sm:space-y-3.5">
            {[
              [Zap, "Live call within the demo"],
              [Users, "Tailored to your vertical"],
              [ShieldCheck, "NDA on request"],
            ].map(([Icon, text]) => (
              <li key={String(text)} className="flex items-start gap-3 text-[13px] text-foreground/85 sm:text-sm">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-primary-foreground sm:h-8 sm:w-8"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                {text as string}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-4 rounded-3xl opacity-40 blur-2xl"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="relative rounded-2xl border border-border bg-card p-5 shadow-elevated sm:p-9">
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center py-14 text-center">
                <div
                  className="grid h-14 w-14 place-items-center rounded-full text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Check className="h-7 w-7" strokeWidth={3} />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-foreground">You're on the list.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  We'll email <span className="font-medium text-foreground">{form.email}</span> within
                  one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" required value={form.name} onChange={(v) => update("name", v)} />
                  <Field label="Work email" type="email" required value={form.email} onChange={(v) => update("email", v)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company" required value={form.company} onChange={(v) => update("company", v)} />
                  <Field label="Phone" type="tel" value={form.phone} onChange={(v) => update("phone", v)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Monthly call volume
                  </label>
                  <select
                    value={form.volume}
                    onChange={(e) => update("volume", e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                  >
                    <option value="">Select a range…</option>
                    <option>Under 1,000 calls</option>
                    <option>1,000 – 10,000 calls</option>
                    <option>10,000 – 50,000 calls</option>
                    <option>50,000+ calls</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    What should the agent do?
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                    placeholder="e.g. Qualify real-estate site-visit leads and book callbacks."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--color-primary)_80%,transparent)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {submitting ? "Sending…" : "Book my demo"}
                  {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
                <p className="text-center text-[11px] text-muted-foreground">
                  By submitting you agree to our terms. We'll never share your data.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} LeadGen+. Made in India, dialing the world.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
          <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link to="/login" className="transition-colors hover:text-foreground">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
