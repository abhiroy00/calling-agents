import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  ssr: true,
  head: () => ({
    meta: [
      { title: "Terms of Service — LeadGen+" },
      { name: "description", content: "Terms governing use of the LeadGen+ AI calling platform." },
      { property: "og:title", content: "Terms of Service — LeadGen+" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="July 12, 2026">
      <p className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        This page is maintained by the LeadGen+ team as a plain-language summary of the terms
        governing use of the platform. It is not a substitute for signed enterprise agreements.
        Contact <a className="text-primary" href="mailto:legal@leadgenplus.in">legal@leadgenplus.in</a> for
        the current master services agreement.
      </p>

      <Section title="1. Acceptance">
        By creating an account or using LeadGen+ (the &quot;Service&quot;), you agree to these
        Terms. If you are using the Service on behalf of an organization, you represent that you
        have authority to bind that organization.
      </Section>

      <Section title="2. The Service">
        LeadGen+ provides tools to import contact lists, run AI-assisted outbound voice
        campaigns, review call recordings and transcripts, and analyze outcomes. Availability,
        included minutes, and seat counts depend on your subscription plan.
      </Section>

      <Section title="3. Your responsibilities">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Only upload contacts you are legally permitted to call.</li>
          <li>Comply with TRAI / DoT regulations, DND / NDNC scrubbing requirements, and any local telemarketing laws that apply to you.</li>
          <li>Obtain and retain any consent required to record calls in your jurisdiction.</li>
          <li>Keep your account credentials confidential and notify us of any suspected compromise.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable use">
        You may not use the Service to place calls that are fraudulent, harassing, threatening,
        or that impersonate a person or entity without authorization. We may suspend accounts
        that violate this section.
      </Section>

      <Section title="5. Fees & billing">
        Subscription fees are billed monthly in advance. AI call minutes beyond your plan pool
        are billed as overage at the rates published on our pricing page. All fees are exclusive
        of applicable taxes.
      </Section>

      <Section title="6. Data & confidentiality">
        Your uploaded leads, recordings, and transcripts remain your data. Our handling of that
        data is described in the <Link to="/privacy" className="text-primary underline-offset-2 hover:underline">Privacy Policy</Link>.
      </Section>

      <Section title="7. Termination">
        You may cancel your subscription at any time from account settings. We may suspend or
        terminate the Service for material breach of these Terms, non-payment, or misuse.
      </Section>

      <Section title="8. Disclaimers & liability">
        The Service is provided on an &quot;as is&quot; basis. To the maximum extent permitted by
        law, our aggregate liability for any claim arising out of the Service is limited to fees
        paid to us in the twelve months preceding the claim.
      </Section>

      <Section title="9. Changes">
        We may update these Terms from time to time. Material changes will be communicated by
        email or in-app notice at least 14 days before they take effect.
      </Section>

      <Section title="10. Contact">
        Questions about these Terms: <a className="text-primary" href="mailto:legal@leadgenplus.in">legal@leadgenplus.in</a>.
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
