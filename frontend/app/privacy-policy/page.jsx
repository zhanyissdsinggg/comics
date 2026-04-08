import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description: `See what data ${siteConfig.siteName} collects, why it is needed, and how to contact us about it.`,
  path: "/privacy-policy",
});

const effectiveDate = "March 9, 2026";

const PRIVACY_SECTIONS = [
  {
    title: "What we collect",
    bullets: [
      "Account details like email address, sign-in identifiers, and profile preferences.",
      "Purchase data tied to memberships, point packs, refunds, and promo redemptions.",
      "Reading and device data such as pages visited, reading progress, device type, and basic diagnostics.",
      "Messages you send us through support, feedback forms, or direct email.",
    ],
  },
  {
    title: "How we use it",
    bullets: [
      "Run the site, sign readers in, and process payments.",
      "Fix bugs, prevent abuse, and keep the product secure.",
      "Personalize recommendations, reading tools, and product messages.",
      "Meet legal obligations, enforce our Terms, and respond to valid requests from authorities.",
    ],
  },
  {
    title: "Why we process and share it",
    paragraphs: [
      `We process information when we need it to run ${siteConfig.siteName}, honor purchases, comply with law, protect the site, or improve the product.`,
      "We may share data with hosting providers, payment processors, analytics vendors, support tools, or rights holders when that is required to run the site.",
    ],
  },
  {
    title: "How long we keep it",
    paragraphs: [
      "We keep data only as long as we need it for the reasons in this policy, including compliance, accounting, disputes, and site integrity.",
      "We use administrative, technical, and organizational safeguards, but no internet system is perfectly secure.",
    ],
  },
  {
    title: "International transfers",
    paragraphs: [
      "Your information may be processed outside the country where you live. When that happens, we use reasonable safeguards based on the type of data involved and the laws that apply.",
    ],
  },
  {
    title: "Your privacy choices",
    paragraphs: [
      "Depending on where you live, you may have the right to access, correct, delete, restrict, object to, or port certain personal information. You may also have the right to withdraw consent where processing depends on consent.",
      `To make a privacy request, contact us at ${siteConfig.privacyEmail}. We may need to verify your identity before completing the request.`,
    ],
  },
  {
    title: "Children",
    paragraphs: [
      "The site is not directed to children under the age required by applicable law in their jurisdiction. If you believe a child provided personal information without proper consent, contact us so we can review it.",
    ],
  },
  {
    title: "Policy updates",
    paragraphs: [
      "We may update this policy when our practices, product features, or legal obligations change. When we make material updates, we will post the new version on this page and update the effective date above.",
    ],
  },
];

function LegalSection({
  title,
  paragraphs = [],
  bullets = [],
  className = "",
  children = null,
}) {
  return (
    <SurfacePanel className={className} appearance="light" accent="blue">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-slate-600 marker:text-[var(--gush-accent)]">
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
    </SurfacePanel>
  );
}

function ContactCard() {
  return (
    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-950">Email:</span>{" "}
        <a
          href={`mailto:${siteConfig.privacyEmail}`}
          className="text-[var(--gush-accent)] transition hover:text-[var(--gush-accent)]"
        >
          {siteConfig.privacyEmail}
        </a>
      </p>
      {siteConfig.companyAddress ? (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-950">Address:</span>{" "}
          {siteConfig.companyAddress}
        </p>
      ) : null}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  const primaryButtonClass =
    "rounded-full border border-[rgba(0,113,227,0.16)] bg-[linear-gradient(180deg,rgba(41,151,255,0.98),rgba(0,113,227,0.94))] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(0,113,227,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(0,113,227,0.24)] hover:shadow-[0_20px_38px_rgba(0,113,227,0.22)]";
  const secondaryButtonClass =
    "rounded-full border border-[color:var(--gush-border)] bg-white/92 px-4 py-2.5 text-sm font-semibold text-[color:var(--gush-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-elevated)]";
  return (
    <div className="gush-home-shell overflow-hidden">
      <div className="gush-page-ambient" />
      <SiteHeader variant="home" />
      <main className="gush-page-main gush-section-stack">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Privacy"
            title="Privacy."
            description={`What data ${siteConfig.companyName} collects, why we need it, and how to contact us about it.`}
            stats={[
              {
                label: "Effective",
                value: effectiveDate,
              },
              {
                label: "Covers",
                value: "Account + reading",
              },
              {
                label: "Your options",
                value: "Access / delete",
              },
              {
                label: "Contact",
                value: siteConfig.privacyEmail,
              },
            ]}
          />

          <SurfacePanel
            tone="muted"
            accent="blue"
            appearance="light"
            className="flex h-full flex-col justify-between space-y-6"
          >
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Contact
              </p>
              <div>
                <h2 className="font-display text-[1.7rem] font-semibold tracking-tight text-slate-950">
                  Privacy contact.
                </h2>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <a
                href={`mailto:${siteConfig.privacyEmail}`}
                className={primaryButtonClass}
              >
                Email privacy
              </a>
              <a
                href={`mailto:${siteConfig.supportEmail}`}
                className={secondaryButtonClass}
              >
                Open Support
              </a>
            </div>
          </SurfacePanel>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          {PRIVACY_SECTIONS.map((section) => (
            <LegalSection key={section.title} {...section} />
          ))}

          <LegalSection title="Privacy requests" className="xl:col-span-2">
            <ContactCard />
          </LegalSection>
        </div>
      </main>
    </div>
  );
}
