import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  ssr: true,
  head: () => ({
    meta: [
      { title: "Privacy Policy — LeadGen+" },
      {
        name: "description",
        content: "How LeadGen+ collects, uses, and protects data on the AI calling platform.",
      },
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
        This page is maintained by the LeadGen+ team to describe how we handle data on the
        platform. It is not a legal certification. For DPAs, subprocessor lists, or region-specific
        addenda, email <a className="text-primary" href="mailto:privacy@leadgenplus.in">privacy@leadgenplus.in</a>.
      </p>

      <Section title="1. Who we are">
        LeadGen+ is an AI outbound calling platform. In this policy, &quot;we&quot; refers to the
        LeadGen+ team, and &quot;you&quot; refers to the customer account holder.
      </Section>

      <Section title="2. Data we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-foreground">Account data:</strong> name, email, workspace, billing details.</li>
          <li><strong className="text-foreground">Lead data you upload:</strong> contact name, phone number, company, email, and any custom fields you provide.</li>
          <li><strong className="text-foreground">Call data:</strong> recordings, transcripts, disposition, duration, and outcome tags.</li>
          <li><strong className="text-foreground">Usage data:</strong> log-in events, feature usage, and error diagnostics to operate and improve the Service.</li>
        </ul>
      </Section>

      <Section title="3. How we use data">
        We use data to provide and secure the Service, place calls on your behalf, generate
        transcripts and analytics, bill for usage, and support you. We do not sell your data.
      </Section>

      <Section title="4. Roles">
        For lead and call data, you are the data controller and we are the processor acting on
        your instructions. You are responsible for the lawful basis of contacting the individuals
        you upload.
      </Section>

      <Section title="5. Subprocessors">
        We use vetted infrastructure and voice providers to deliver the Service (cloud hosting,
        telephony carriers, and speech / language model providers). The current list is available
        on request at <a className="text-primary" href="mailto:privacy@leadgenplus.in">privacy@leadgenplus.in</a>.
      </Section>

      <Section title="6. Security">
        Access to the Service requires authenticated sessions. Data in transit is protected with
        TLS. Access to production systems is restricted to authorized personnel. Report suspected
        vulnerabilities to <a className="text-primary" href="mailto:security@leadgenplus.in">security@leadgenplus.in</a>.
      </Section>

      <Section title="7. Retention & deletion">
        Recordings and transcripts are retained for the period configured on your plan (default 90
        days) and deleted afterwards. You may request earlier deletion of specific records from
        your workspace or by contacting us.
      </Section>

      <Section title="8. Your rights">
        Depending on where you or the contacted individuals reside, you or they may have rights
        to access, correct, delete, or object to processing of personal data. Contact us to
        exercise these rights and we will respond within the timeframe required by applicable
        law (including the Digital Personal Data Protection Act, 2023 in India).
      </Section>

      <Section title="9. Cookies">
        We use strictly necessary cookies to keep you signed in and a small number of analytics
        cookies to measure product usage. You can block non-essential cookies in your browser.
      </Section>

      <Section title="10. Changes">
        We will post updates to this policy on this page and, for material changes, notify you by
        email or in-app notice.
      </Section>

      <Section title="11. Contact">
        Privacy questions: <a className="text-primary" href="mailto:privacy@leadgenplus.in">privacy@leadgenplus.in</a>.
      </Section>
    </LegalShell>
  );
}

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
