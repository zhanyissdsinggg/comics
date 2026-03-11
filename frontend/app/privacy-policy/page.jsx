import SiteHeader from "../../components/layout/SiteHeader";
import InfoPageNav from "../../components/layout/InfoPageNav";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description: `Learn how ${siteConfig.siteName} collects, uses, and protects personal information.`,
  path: "/privacy-policy",
});

const effectiveDate = "March 9, 2026";

function ContactCard() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-300">
      <p>
        <strong>Email:</strong> {siteConfig.privacyEmail}
      </p>
      {siteConfig.companyAddress ? (
        <p className="mt-2">
          <strong>Address:</strong> {siteConfig.companyAddress}
        </p>
      ) : null}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SiteHeader />
      <main className="px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <InfoPageNav current="privacy" />
        <header className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Legal</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="max-w-3xl text-sm leading-7 text-neutral-300 sm:text-base">
            This policy explains what data {siteConfig.companyName} collects, why we collect it, how we protect it, and
            what choices you have.
          </p>
          <p className="text-sm text-neutral-500">Effective date: {effectiveDate}</p>
        </header>

        <section className="space-y-6 rounded-3xl border border-white/10 bg-neutral-900/80 p-8 text-neutral-300">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">1. Information we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Account details such as email address, login identifiers, and profile preferences.</li>
              <li>Transactional data related to purchases, subscriptions, refunds, and promotional redemptions.</li>
              <li>Usage data such as pages visited, reading progress, device type, and basic diagnostic information.</li>
              <li>Messages you send to support, feedback forms, or other direct communications with us.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">2. How we use information</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Operate the service, authenticate users, and process payments.</li>
              <li>Improve stability, fix bugs, monitor abuse, and maintain security.</li>
              <li>Personalize recommendations, reading features, and product messaging.</li>
              <li>Meet legal obligations, enforce our Terms, and respond to valid requests from authorities.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">3. Legal bases and sharing</h2>
            <p>
              We process information when it is necessary to perform our contract with you, comply with law, protect the
              service, or pursue legitimate business interests such as fraud prevention and service improvement. We may
              share data with infrastructure providers, payment processors, analytics vendors, customer support tools,
              or rights holders when needed to operate the platform.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">4. Retention and security</h2>
            <p>
              We retain data only as long as it is needed for the purposes described here, including compliance,
              accounting, dispute resolution, and service integrity. We use administrative, technical, and organizational
              safeguards designed to protect personal information, but no system is perfectly secure.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">5. International transfers</h2>
            <p>
              Your information may be processed in countries other than where you live. When that happens, we use
              reasonable safeguards appropriate for the type of data involved and the legal requirements that apply.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">6. Your rights</h2>
            <p>
              Depending on where you live, you may have the right to access, correct, delete, restrict, object to, or
              port certain personal information. You may also have the right to withdraw consent where processing depends
              on consent.
            </p>
            <p>
              To make a privacy request, contact us at {siteConfig.privacyEmail}. We may need to verify your identity
              before completing the request.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">7. Children</h2>
            <p>
              The service is not directed to children under the age required by applicable law in their jurisdiction.
              If you believe a child provided personal information without proper consent, contact us so we can review it.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">8. Policy updates</h2>
            <p>
              We may update this policy when our practices, product features, or legal obligations change. When we make
              material updates, we will post the new version on this page and update the effective date above.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">9. Contact</h2>
            <p>If you have privacy questions or data rights requests, contact us here:</p>
            <ContactCard />
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}
