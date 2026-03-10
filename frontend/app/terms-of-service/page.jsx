import Link from "next/link";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Terms of Service",
  description: `Read the terms that govern access to ${siteConfig.siteName} and the services we provide.`,
  path: "/terms-of-service",
});

const effectiveDate = "March 9, 2026";

function ContactCard() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-300">
      <p>
        <strong>Email:</strong> {siteConfig.legalEmail}
      </p>
      {siteConfig.companyAddress ? (
        <p className="mt-2">
          <strong>Address:</strong> {siteConfig.companyAddress}
        </p>
      ) : null}
    </div>
  );
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-16 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Legal</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Terms of Service</h1>
          <p className="max-w-3xl text-sm leading-7 text-neutral-300 sm:text-base">
            These Terms govern your use of {siteConfig.siteName}. By accessing or using the site, you agree to follow
            these Terms, our <Link href="/privacy-policy" className="text-emerald-300 hover:text-emerald-200"> Privacy Policy</Link>,
            and any service-specific rules shown inside the product.
          </p>
          <p className="text-sm text-neutral-500">Effective date: {effectiveDate}</p>
        </header>

        <section className="space-y-6 rounded-3xl border border-white/10 bg-neutral-900/80 p-8 text-neutral-300">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">1. Eligibility and accounts</h2>
            <p>
              You must provide accurate account information and keep your login credentials secure. If you use the
              platform on behalf of an organization, you confirm that you are authorized to bind that organization.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">2. Acceptable use</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Do not misuse the service, interfere with other users, or attempt to bypass technical restrictions.</li>
              <li>Do not scrape, reverse engineer, resell, or automate access in ways we have not explicitly approved.</li>
              <li>Do not upload unlawful, infringing, fraudulent, or abusive material.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">3. Digital content and purchases</h2>
            <p>
              Purchases, subscriptions, credits, and promotional benefits are licensed for personal use inside the
              service unless a separate written agreement says otherwise. Prices, catalog availability, and promotional
              rules may change at any time, but those changes will not retroactively remove content you have already
              lawfully unlocked unless required for legal or operational reasons.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">4. Intellectual property</h2>
            <p>
              The platform, site design, trademarks, software, and all associated content are owned by {siteConfig.companyName}
              or its licensors. These Terms do not transfer ownership to you. You may not reproduce or distribute content
              outside the service except where the law clearly allows it.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">5. Availability and changes</h2>
            <p>
              We work to keep the service available and accurate, but we do not promise uninterrupted access. We may
              update features, pricing, catalogs, security controls, or supported regions when necessary to maintain the
              product or comply with law.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">6. Suspension and termination</h2>
            <p>
              We may suspend or terminate access if you violate these Terms, create risk for the platform, or use the
              service in a way that harms other users, rights holders, or our operations.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">7. Warranty disclaimer</h2>
            <p>
              The service is provided on an "as is" and "as available" basis to the maximum extent permitted by law. We do
              not make guarantees that the service will always be uninterrupted, error-free, or suitable for every
              purpose.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">8. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, {siteConfig.companyName} will not be liable for indirect,
              incidental, consequential, special, exemplary, or punitive damages arising from your use of the service.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">9. Governing law</h2>
            <p>
              These Terms are governed by the laws that apply to the place where {siteConfig.companyName} operates,
              without regard to conflict-of-law principles. Disputes will be resolved in the courts or forums with
              competent jurisdiction over that place, unless mandatory law requires a different venue.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">10. Contact</h2>
            <p>If you have legal questions or need to send a formal notice, contact us here:</p>
            <ContactCard />
          </div>
        </section>
      </div>
    </main>
  );
}
