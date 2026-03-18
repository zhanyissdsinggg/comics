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
      <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-slate-600 marker:text-[var(--gush-accent,#2f6bff)]">
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
    <div className="rounded-[24px] border border-black/8 bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-950">Email:</span>{" "}
        <a
          href={`mailto:${siteConfig.privacyEmail}`}
          className="text-[var(--gush-accent,#2f6bff)] transition hover:text-[rgba(47,107,255,0.8)]"
        >
          {siteConfig.privacyEmail}
        </a>
      </p>
      {siteConfig.companyAddress ? (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-950">Address:</span> {siteConfig.companyAddress}
        </p>
      ) : null}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <SiteHeader variant="light" />
      <main className="relative px-4 py-8 pb-14 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Privacy"
            title="Privacy, in plain English."
            description={`Here is what data ${siteConfig.companyName} collects, why we need it, and what choices you have.`}
            secondary="We organized this page to be scanned quickly, not buried in legal fog."
            stats={[
              {
                label: "Effective",
                value: effectiveDate,
                hint: "This is the current version of the policy.",
              },
              {
                label: "Covers",
                value: "Account + reading",
                hint: "Includes purchases, usage, and support messages.",
              },
              {
                label: "Your options",
                value: "Access / delete",
                hint: "Available rights depend on the laws that apply where you live.",
              },
              {
                label: "Contact",
                value: siteConfig.privacyEmail,
                hint: "Privacy questions and data requests should go here.",
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            {PRIVACY_SECTIONS.map((section) => (
              <LegalSection key={section.title} {...section} />
            ))}

            <LegalSection
              title="Questions or requests"
              className="xl:col-span-2"
              paragraphs={[
                "If you have a privacy question or want to make a data request, use the contact details below.",
              ]}
            >
              <ContactCard />
            </LegalSection>
          </div>
        </div>
      </main>
    </div>
  );
}
