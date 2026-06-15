// app/privacy-policy/page.tsx
// Privacy Policy (GDPR) — HappyApplaid — ENGLISH version
// ⚠️ FILL THE BRACKETS: [YOUR NAME] and [EMAIL]. Keep these IDENTICAL to the
//    Finnish /tietosuoja page (same controller name, same email).
// ⚠️ Mirror of app/tietosuoja/page.tsx — if you change one, change both.
// ⚠️ NOT LEGAL ADVICE — have it reviewed by a lawyer before launch.

export const metadata = {
  title: 'Privacy Policy – HappyApplaid',
  description: 'How HappyApplaid processes your personal data (GDPR).',
};

export default function PrivacyPolicyPage() {
  const updated = '13.6.2026'; // keep in sync with /tietosuoja

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-gray-800 dark:text-neutral-200">
      <div className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-10">
          Last updated {updated} · EU General Data Protection Regulation (GDPR)
        </p>

        <Section title="1. Data controller">
          <p>
            The data controller responsible for this service (HappyApplaid,
            happyapplaid.com) is a private individual:
          </p>
          <p className="mt-2">
            <strong>[YOUR NAME]</strong><br />
            Email: <strong>[EMAIL]</strong>
          </p>
          <p className="mt-2">
            For any privacy-related matters, please contact the email above.
          </p>
        </Section>

        <Section title="2. What data we collect">
          <p>We process the following personal data:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Account data:</strong> name and email address (collected at sign-up, via Clerk).</li>
            <li><strong>Profile data:</strong> the information you provide for your CVs and cover letters (work experience, education, skills, optional answers to personality questions).</li>
            <li><strong>Generated content:</strong> the CVs and cover letters you create and any related image files.</li>
            <li><strong>Usage data:</strong> a record of the AI features you use (to track weekly usage).</li>
            <li><strong>Payment data:</strong> subscription status and billing period. Actual card details are handled by Stripe — we do not store them.</li>
          </ul>
        </Section>

        <Section title="3. Purposes and legal bases">
          <p>We process data for the following purposes:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Providing the service</strong> (creating CVs and cover letters) — legal basis: performance of a contract.</li>
            <li><strong>Managing your account and subscription</strong> — legal basis: performance of a contract.</li>
            <li><strong>Enforcing usage limits and preventing abuse</strong> (weekly usage tracking) — legal basis: legitimate interest.</li>
            <li><strong>Improving the service</strong> (anonymous visitor analytics) — legal basis: legitimate interest.</li>
          </ul>
        </Section>

        <Section title="4. Use of artificial intelligence">
          <p>
            The service uses OpenAI language models to generate CVs and cover letters. The
            profile and job-posting information you provide is sent to OpenAI for the purpose
            of generating content. We do not use your data to train AI models.
          </p>
        </Section>

        <Section title="5. Service providers (data recipients)">
          <p>We use trusted sub-processors to handle data:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Clerk</strong> — authentication and user management.</li>
            <li><strong>Supabase</strong> — database and file storage.</li>
            <li><strong>Stripe</strong> — payment processing.</li>
            <li><strong>OpenAI</strong> — content generation (AI).</li>
            <li><strong>Vercel</strong> — hosting and privacy-friendly visitor analytics (Vercel Analytics uses no cookies and does not identify individual users).</li>
          </ul>
          <p className="mt-2">
            Some service providers may process data outside the EU/EEA (e.g. the United
            States). In such cases the transfer is based on EU-approved safeguards (e.g.
            Standard Contractual Clauses).
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            We only use cookies that are <strong>strictly necessary</strong> for the service
            to function: maintaining your login and session (Clerk) and processing payments
            (Stripe). These do not require separate consent. We do not use advertising or
            tracking cookies. Visitor analytics (Vercel Analytics) works without cookies.
          </p>
        </Section>

        <Section title="7. Data retention">
          <p>
            We retain your personal data for as long as you have an active account. When you
            <strong> delete your account, all your personal data and the content you have
            created is deleted immediately</strong> (CVs, cover letters, profile data, image
            files and usage history). Data related to payment transactions may be retained for
            the period required by accounting legislation.
          </p>
        </Section>

        <Section title="8. Your rights">
          <p>You have the following GDPR rights:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>The right to access your data.</li>
            <li>The right to rectify inaccurate data.</li>
            <li>The right to erase your data (&quot;right to be forgotten&quot;) — you can delete your account at any time from settings.</li>
            <li>The right to restrict or object to processing.</li>
            <li>The right to data portability.</li>
            <li>The right to lodge a complaint with a supervisory authority (in Finland, the Office of the Data Protection Ombudsman, tietosuoja.fi).</li>
          </ul>
          <p className="mt-2">
            You can exercise your rights by contacting the email above, or by deleting your
            account directly from the service settings.
          </p>
        </Section>

        <Section title="9. Data security">
          <p>
            Data is stored on secure servers and connections are encrypted. Access to data is
            restricted. However, we cannot guarantee absolute security over the internet.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy as the service evolves. We will announce significant
            changes within the service. Last updated: {updated}.
          </p>
        </Section>

        <p className="mt-12 text-xs text-gray-400 dark:text-neutral-600">
          This policy was prepared in good faith but does not constitute legal advice.
        </p>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
      <div className="text-sm leading-relaxed text-gray-700 dark:text-neutral-300">{children}</div>
    </section>
  );
}