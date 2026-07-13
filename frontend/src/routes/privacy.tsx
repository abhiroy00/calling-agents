import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  ssr: true,
  head: () => ({
    meta: [
      { title: "Privacy Policy — LeadGen+" },
      { name: "description", content: "How LeadGen+ handles and protects your data." },
      { property: "og:title", content: "Privacy Policy — LeadGen+" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="July 12, 2026">
      <p className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        This page outlines how LeadGen+ collects, uses, and protects your data. For the
        full data processing agreement, contact{" "}
        <a className="text-primary" href="mailto:legal@leadgenplus.in">
          legal@leadgenplus.in
        </a>
        .
      </p>

      <Section title="1. What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Account information</strong> — name, email, company name, and billing details
            you provide at sign-up.
          </li>
          <li>
            <strong>Uploaded contact data</strong> — lead lists (names, phone numbers, company
            details) that you import for outbound calling.
          </li>
          <li>
            <strong>Call recordings & transcripts</strong> — audio and text of AI-assisted calls
            placed through the platform.
          </li>
          <li>
            <strong>Usage logs</strong> — call duration, timestamps, campaign IDs, and
            error/failure metadata necessary for billing and troubleshooting.
          </li>
        </ul>
      </Section>

      <Section title="2. How we use your data">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Deliver the AI calling service you subscribed to.</li>
          <li>Generate dashboards, analytics, and call-quality reports.</li>
          <li>Bill you accurately based on minutes consumed and plan tier.</li>
          <li>Improve AI voice models using de-identified call transcripts (opt-out available in settings).</li>
          <li>Send transactional emails (invoices, usage alerts, plan renewals).</li>
        </ul>
      </Section>

      <Section title="3. Data retention">
        <p>Uploaded leads, recordings, and transcripts are retained for the life of your
        subscription plus 30 days after cancellation, after which they are permanently
        deleted. You may request early deletion at any time by contacting support.</p>
      </Section>

      <Section title="4. Data sharing">
        <p>We do not sell your data. We share data only with sub-processors necessary to
        operate the Service (cloud infrastructure, telephony carriers, AI/LLM providers)
        and only to the extent required for those purposes. All sub-processors are bound by
        data processing agreements consistent with this Policy.</p>
      </Section>

      <Section title="5. Security">
        <p>Data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access to
        production systems is restricted to authorized personnel with multi-factor
        authentication. We conduct regular penetration tests and security audits.</p>
      </Section>

      <Section title="6. Your rights">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Export your data at any time from the dashboard.</li>
          <li>Request correction or deletion of your personal data.</li>
          <li>Opt out of model-improvement data sharing in workspace settings.</li>
          <li>Withdraw consent where processing is based on consent.</li>
        </ul>
      </Section>

      <Section title="7. Cookies">
        <p>We use essential session cookies for authentication. We do not use tracking
        cookies, advertising pixels, or third-party analytics scripts on the product
        dashboard. The public marketing site may use anonymous analytics (see our{" "}
        <Link to="/terms" className="text-primary underline-offset-2 hover:underline">
          Terms of Service
        </Link>
        ).</p>
      </Section>

      <Section title="8. Changes">
        <p>We may update this Policy from time to time. Material changes will be communicated
        by email or in-app notice at least 14 days before they take effect.</p>
      </Section>

      <Section title="9. Contact">
        <p>
          Data Protection Officer:{" "}
          <a className="text-primary" href="mailto:dpo@leadgenplus.in">
            dpo@leadgenplus.in
          </a>
          . For general privacy questions:{" "}
          <a className="text-primary" href="mailto:legal@leadgenplus.in">
            legal@leadgenplus.in
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}

// Shared layout & Section are colocated to avoid an extra file.
function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="font-display text-sm font-semibold">
            LeadGen<span className="text-primary">+</span>
          </Link>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Legal</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">{children}</div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-2 space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}