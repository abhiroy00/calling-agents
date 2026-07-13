import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import {
  Rocket,
  PhoneCall,
  BarChart3,
  Radio,
  Sparkles,
  Check,
  ArrowRight,
  Zap,
  ShieldCheck,
  Users,
  Bolt,
  Waves,
  Play,
  Star,
} from "lucide-react";
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
    // Prevent flash of landing content while the redirect resolves.
    return (
      <div className="grid min-h-screen place-items-center bg-[#08070f] text-white/70">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c5cff]" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08070f] text-white antialiased selection:bg-[#7c5cff]/40">
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
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124,92,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.10) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 80%)",
        }}
      />
      <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#7c5cff] opacity-30 blur-[140px]" />
      <div className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-[#ff3d81] opacity-20 blur-[140px]" />
      <div className="absolute bottom-0 -left-40 h-[28rem] w-[28rem] rounded-full bg-[#22d3ee] opacity-15 blur-[140px]" />
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />
    </div>
  );
}

/* ---------- header ---------- */
function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#08070f]/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#ff3d81] shadow-[0_0_30px_-6px_rgba(124,92,255,0.7)]">
            <Rocket className="h-4 w-4" strokeWidth={2.4} />
            <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            LeadGen<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#ff3d81]">+</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-white/60 md:flex">
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          <a href="#showcase" className="transition-colors hover:text-white">Live agents</a>
          <a href="#demo" className="transition-colors hover:text-white">Book a demo</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Sign in
          </Link>
          <a
            href="#demo"
            className="group hidden items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7c5cff] to-[#ff3d81] px-3.5 py-1.5 text-sm font-semibold text-white shadow-[0_0_24px_-8px_rgba(124,92,255,0.9)] transition-transform hover:-translate-y-px sm:inline-flex"
          >
            Book a demo
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */
function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c5cff]" />
            Live · Hindi + English voice agents
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-[88px]">
            Outbound sales,
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#a78bfa] via-[#ff3d81] to-[#f59e0b] bg-clip-text text-transparent">
                on autopilot.
              </span>
              <svg
                className="absolute -bottom-2 left-0 h-3 w-full text-[#ff3d81]/70"
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
          <p className="mx-auto mt-7 max-w-2xl text-lg text-white/60 sm:text-xl">
            The AI SDR that dials 10,000 leads before your reps finish their chai.
            Books meetings 24×7 at <span className="text-white">₹2/minute</span>. Built for Indian SMBs.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#demo"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#ff3d81] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_40px_-8px_rgba(124,92,255,0.9)] transition-transform hover:-translate-y-0.5"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start dialing free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </a>
            <a
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/[0.08]"
            >
              <Play className="h-4 w-4 fill-current" />
              Hear a live call
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-widest text-white/40">
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#7c5cff]" /> 100 free minutes</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#7c5cff]" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#7c5cff]" /> Setup in 4 minutes</span>
          </div>
        </div>

        {/* Console preview */}
        <div className="relative mx-auto mt-20 max-w-5xl">
          <div className="absolute -inset-x-10 -top-8 bottom-0 rounded-[2rem] bg-gradient-to-b from-[#7c5cff]/30 via-transparent to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-1 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-[11px] font-medium text-white/40">leadgen.plus / live</span>
              <span className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live · 47 calls
              </span>
            </div>
            <div className="grid gap-px bg-white/5 sm:grid-cols-[1fr_1.4fr]">
              <div className="space-y-2 bg-[#0d0b18] p-5">
                {[
                  { name: "Rahul Sharma", city: "Mumbai · Real estate", status: "Talking", pulse: true },
                  { name: "Priya Patel", city: "Ahmedabad · Insurance", status: "Booked ✓", ok: true },
                  { name: "Arjun Mehta", city: "Bengaluru · EdTech", status: "Voicemail" },
                  { name: "Kavya Reddy", city: "Hyderabad · Coaching", status: "Ringing…" },
                  { name: "Vikram Singh", city: "Delhi · Real estate", status: "Booked ✓", ok: true },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-[13px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{row.name}</p>
                      <p className="truncate text-[11px] text-white/40">{row.city}</p>
                    </div>
                    <span
                      className={
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                        (row.ok
                          ? "bg-emerald-400/15 text-emerald-300"
                          : row.pulse
                            ? "bg-[#7c5cff]/20 text-[#c4b5fd]"
                            : "bg-white/5 text-white/50")
                      }
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="relative bg-[#0a0813] p-5">
                <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/40">
                  <Waves className="h-3.5 w-3.5 text-[#7c5cff]" /> Transcript · Rahul Sharma
                </div>
                <div className="space-y-3 text-[13px]">
                  <div className="flex gap-2">
                    <span className="shrink-0 rounded-md bg-[#7c5cff]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#c4b5fd]">AI</span>
                    <p className="text-white/80">Hi Rahul, this is Ananya from Prestige Realty. You inquired about the Whitefield 3BHK — is now a good time?</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/70">You</span>
                    <p className="text-white/70">Haan, batao. Kya price hai?</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 rounded-md bg-[#7c5cff]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#c4b5fd]">AI</span>
                    <p className="text-white/80">Starting at ₹1.4Cr, possession Dec 2026. Would Saturday 11am work for a site visit?</p>
                  </div>
                </div>
                <div className="mt-5 flex items-end gap-0.5">
                  {[16, 28, 40, 22, 34, 46, 30, 24, 38, 52, 28, 18, 32, 44, 26, 20, 36].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-sm bg-gradient-to-t from-[#7c5cff] to-[#ff3d81]"
                      style={{ height: `${h}px`, opacity: 0.35 + (i % 4) * 0.15 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- logo strip ---------- */
function LogoStrip() {
  const logos = ["PROPTECH.CO", "EDMAX", "SUNRISE INS.", "CODEKUL", "URBANFIT", "MEDIQ", "FLYBOX"];
  return (
    <section className="border-y border-white/5 bg-white/[0.015]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="text-center text-[11px] uppercase tracking-[0.3em] text-white/40">
          Powering outbound at 400+ Indian SMBs
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {logos.map((l) => (
            <span key={l} className="text-sm font-semibold tracking-widest text-white/30 transition-colors hover:text-white/70">
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- stats ---------- */
function StatsStrip() {
  return (
    <section>
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-16 sm:px-6 md:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center backdrop-blur transition-colors hover:border-[#7c5cff]/40">
            <p className="tabular bg-gradient-to-b from-white to-white/60 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {v}
            </p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/40">{k}</p>
            <span className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#7c5cff] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
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
    accent: "from-[#7c5cff] to-[#a78bfa]",
  },
  {
    icon: Radio,
    title: "Live call board",
    body: "Every conversation, in real time. Barge in, whisper coaching, or slam the takeover button.",
    accent: "from-[#ff3d81] to-[#f59e0b]",
  },
  {
    icon: BarChart3,
    title: "Analytics & recordings",
    body: "Transcripts, sentiment, outcome tagging, and a firehose of insights. One-click CRM export.",
    accent: "from-[#22d3ee] to-[#7c5cff]",
  },
  {
    icon: ShieldCheck,
    title: "DPDP-ready",
    body: "DND/NDNC scrubbing, recorded consent, and Indian data residency. Sleep at night.",
    accent: "from-emerald-400 to-[#22d3ee]",
  },
];

function Features() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a78bfa]">
            <Bolt className="mr-1 inline h-3 w-3" /> The platform
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Everything Apollo wishes
            <br />
            <span className="bg-gradient-to-r from-[#a78bfa] to-[#ff3d81] bg-clip-text text-transparent">
              they'd shipped.
            </span>
          </h2>
          <p className="mt-4 text-white/60">
            One console. Every outbound motion. Zero duct tape.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, body, accent }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 transition-all hover:-translate-y-1 hover:border-white/25"
            >
              <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${accent} shadow-lg`}>
                <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{body}</p>
              <span className={`pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${accent} opacity-0 blur-3xl transition-opacity group-hover:opacity-30`} />
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
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1030] via-[#0d0b18] to-[#1a0a1f] p-10 sm:p-14">
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-[#7c5cff]/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-[#ff3d81]/30 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a78bfa]">
                Under the hood
              </p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Ten thousand dials.
                <br />
                <span className="bg-gradient-to-r from-[#ff3d81] to-[#f59e0b] bg-clip-text text-transparent">
                  One coffee break.
                </span>
              </h2>
              <p className="mt-5 text-white/60">
                LeadGen+ fires up parallel voice agents on your entire lead list. Warm callbacks
                land in your CRM before you finish reviewing pipeline.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {[
                  "Concurrent AI callers — 1 to 1,000",
                  "Automatic retries on busy / no-answer",
                  "Sentiment-tagged transcripts, delivered live",
                  "Native WhatsApp follow-up after every call",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-white/80">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#7c5cff] to-[#ff3d81]">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-[12px] leading-relaxed shadow-2xl backdrop-blur">
                <p className="text-white/40">$ leadgen dial --campaign whitefield-3bhk --list leads.csv</p>
                <p className="mt-2 text-emerald-400">✓ 2,431 numbers scrubbed against DND/NDNC</p>
                <p className="text-emerald-400">✓ 12 agents spun up · avg latency 142ms</p>
                <p className="mt-2 text-[#c4b5fd]">→ Dialing in parallel…</p>
                <p className="text-white/60">  ├─ +91 98•••••210 · <span className="text-emerald-300">BOOKED</span> (Sat 11am)</p>
                <p className="text-white/60">  ├─ +91 99•••••847 · <span className="text-emerald-300">BOOKED</span> (Sun 4pm)</p>
                <p className="text-white/60">  ├─ +91 98•••••112 · <span className="text-white/40">voicemail — retrying</span></p>
                <p className="text-white/60">  └─ +91 90•••••334 · <span className="text-[#ff3d81]">not interested</span></p>
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
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a78bfa]">Pricing</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Priced per minute.
            <br />
            <span className="bg-gradient-to-r from-[#a78bfa] to-[#ff3d81] bg-clip-text text-transparent">
              Not per victim.
            </span>
          </h2>
          <p className="mt-4 text-white/60">
            Monthly plans include a pool of AI call minutes. Overage at ₹2/min. Cancel any time.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={
                "group relative flex flex-col overflow-hidden rounded-2xl p-7 transition-all " +
                (tier.highlight
                  ? "border border-[#7c5cff]/40 bg-gradient-to-b from-[#7c5cff]/[0.12] to-[#ff3d81]/[0.06] shadow-[0_0_60px_-20px_rgba(124,92,255,0.6)]"
                  : "border border-white/10 bg-white/[0.02] hover:border-white/25")
              }
            >
              {tier.highlight && (
                <>
                  <span className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#ff3d81] to-transparent" />
                  <span className="absolute right-5 top-5 rounded-full bg-gradient-to-r from-[#7c5cff] to-[#ff3d81] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                    Most popular
                  </span>
                </>
              )}
              <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
              <p className="mt-1 text-sm text-white/50">{tier.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-white">{tier.price}</span>
                <span className="text-sm text-white/40">{tier.cadence}</span>
              </div>
              <ul className="mt-7 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/80">
                    <span
                      className={
                        "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full " +
                        (tier.highlight
                          ? "bg-gradient-to-br from-[#7c5cff] to-[#ff3d81]"
                          : "bg-white/10")
                      }
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
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
                    ? "bg-gradient-to-r from-[#7c5cff] to-[#ff3d81] text-white shadow-[0_0_30px_-8px_rgba(124,92,255,0.9)] hover:-translate-y-0.5"
                    : "border border-white/15 bg-white/5 text-white hover:bg-white/10")
                }
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
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {quotes.map((t) => (
            <figure
              key={t.a}
              className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-7"
            >
              <div className="flex gap-0.5 text-[#f59e0b]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 text-[15px] leading-relaxed text-white/85">"{t.q}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#7c5cff] to-[#ff3d81] text-sm font-bold text-white">
                  {t.a[0]}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{t.a}</p>
                  <p className="text-[11px] text-white/40">{t.r}</p>
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
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#a78bfa]">Book a demo</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            See it dial your leads.
            <br />
            <span className="bg-gradient-to-r from-[#a78bfa] to-[#ff3d81] bg-clip-text text-transparent">
              Live. On this call.
            </span>
          </h2>
          <p className="mt-5 text-white/60">
            30-minute demo. We'll spin up an AI agent on your script and dial 5 real numbers from
            your list. You decide if it's ready for production.
          </p>
          <ul className="mt-8 space-y-3.5">
            {[
              [Zap, "Live call within the demo"],
              [Users, "Tailored to your vertical"],
              [ShieldCheck, "NDA on request"],
            ].map(([Icon, text]) => (
              <li key={String(text)} className="flex items-start gap-3 text-sm text-white/85">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#7c5cff] to-[#ff3d81]">
                  <Icon className="h-4 w-4 text-white" />
                </span>
                {text as string}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#7c5cff]/30 to-[#ff3d81]/20 opacity-60 blur-2xl" />
          <div className="relative rounded-2xl border border-white/10 bg-[#0d0b18]/90 p-7 shadow-2xl backdrop-blur sm:p-9">
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center py-14 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#7c5cff] to-[#ff3d81]">
                  <Check className="h-7 w-7 text-white" strokeWidth={3} />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-white">You're on the list.</h3>
                <p className="mt-2 text-sm text-white/60">
                  We'll email <span className="font-medium text-white">{form.email}</span> within
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
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                    Monthly call volume
                  </label>
                  <select
                    value={form.volume}
                    onChange={(e) => update("volume", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white focus:border-[#7c5cff] focus:outline-none focus:ring-2 focus:ring-[#7c5cff]/30"
                  >
                    <option value="" className="bg-[#0d0b18]">Select a range…</option>
                    <option className="bg-[#0d0b18]">Under 1,000 calls</option>
                    <option className="bg-[#0d0b18]">1,000 – 10,000 calls</option>
                    <option className="bg-[#0d0b18]">10,000 – 50,000 calls</option>
                    <option className="bg-[#0d0b18]">50,000+ calls</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                    What should the agent do?
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#7c5cff] focus:outline-none focus:ring-2 focus:ring-[#7c5cff]/30"
                    placeholder="e.g. Qualify real-estate site-visit leads and book callbacks."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#ff3d81] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_30px_-8px_rgba(124,92,255,0.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Book my demo"}
                  {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
                <p className="text-center text-[11px] text-white/40">
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
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
        {label} {required && <span className="text-[#ff3d81]">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#7c5cff] focus:outline-none focus:ring-2 focus:ring-[#7c5cff]/30"
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-xs text-white/40 sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} LeadGen+. Made in India, dialing the world.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#pricing" className="transition-colors hover:text-white">Pricing</a>
          <Link to="/terms" className="transition-colors hover:text-white">Terms</Link>
          <Link to="/privacy" className="transition-colors hover:text-white">Privacy</Link>
          <Link to="/login" className="transition-colors hover:text-white">Sign in</Link>
        </div>
      </div>
    </footer>
  );
}
