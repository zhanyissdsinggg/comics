import EditorialHero from "../../components/common/EditorialHero";
import SurfacePanel from "../../components/common/SurfacePanel";
import InfoPageNav from "../../components/layout/InfoPageNav";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description: `Learn how ${siteConfig.siteName} collects, uses, and protects personal information.`,
  path: "/privacy-policy",
});

const effectiveDate = "March 9, 2026";

const PRIVACY_SECTIONS = [
  {
    title: "1. Information we collect",
    bullets: [
      "Account details such as email address, login identifiers, and profile preferences.",
      "Transactional data related to purchases, subscriptions, refunds, and promotional redemptions.",
      "Usage data such as pages visited, reading progress, device type, and basic diagnostic information.",
      "Messages you send to support, feedback forms, or other direct communications with us.",
    ],
  },
  {
    title: "2. How we use information",
    bullets: [
      "Operate the service, authenticate users, and process payments.",
      "Improve stability, fix bugs, monitor abuse, and maintain security.",
      "Personalize recommendations, reading features, and product messaging.",
      "Meet legal obligations, enforce our Terms, and respond to valid requests from authorities.",
    ],
  },
  {
    title: "3. Legal bases and sharing",
    paragraphs: [
      "We process information when it is necessary to perform our contract with you, comply with law, protect the service, or pursue legitimate business interests such as fraud prevention and service improvement.",
      "We may share data with infrastructure providers, payment processors, analytics vendors, customer support tools, or rights holders when needed to operate the platform.",
    ],
  },
  {
    title: "4. Retention and security",
    paragraphs: [
      "We retain data only as long as it is needed for the purposes described here, including compliance, accounting, dispute resolution, and service integrity.",
      "We use administrative, technical, and organizational safeguards designed to protect personal information, but no system is perfectly secure.",
    ],
  },
  {
    title: "5. International transfers",
    paragraphs: [
      "Your information may be processed in countries other than where you live. When that happens, we use reasonable safeguards appropriate for the type of data involved and the legal requirements that apply.",
    ],
  },
  {
    title: "6. Your rights",
    paragraphs: [
      "Depending on where you live, you may have the right to access, correct, delete, restrict, object to, or port certain personal information. You may also have the right to withdraw consent where processing depends on consent.",
      `To make a privacy request, contact us at ${siteConfig.privacyEmail}. We may need to verify your identity before completing the request.`,
    ],
  },
  {
    title: "7. Children",
    paragraphs: [
      "The service is not directed to children under the age required by applicable law in their jurisdiction. If you believe a child provided personal information without proper consent, contact us so we can review it.",
    ],
  },
  {
    title: "8. Policy updates",
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
    <SurfacePanel className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">Policy section</p>
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-neutral-300">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-neutral-300 marker:text-emerald-300/80">
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
    <div className="rounded-[24px] border border-white/8 bg-black/20 px-5 py-4 backdrop-blur-sm">
      <p className="text-sm text-neutral-300">
        <span className="font-semibold text-white">Email:</span>{" "}
        <a
          href={`mailto:${siteConfig.privacyEmail}`}
          className="text-emerald-200 transition hover:text-emerald-100"
        >
          {siteConfig.privacyEmail}
        </a>
      </p>
      {siteConfig.companyAddress ? (
        <p className="mt-3 text-sm text-neutral-300">
          <span className="font-semibold text-white">Address:</span> {siteConfig.companyAddress}
        </p>
      ) : null}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <SiteHeader />
      <main className="px-4 py-8 pb-14 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <InfoPageNav current="privacy" />

          <EditorialHero
            eyebrow="Legal"
            title="Privacy Policy"
            description={`This policy explains what data ${siteConfig.companyName} collects, why we collect it, how we protect it, and what choices you have.`}
            secondary="The summary below is organized for scan speed so users can find collection, usage, rights, and contact details without wading through a wall of text."
            stats={[
              {
                label: "Effective",
                value: effectiveDate,
                hint: "The current policy version is identified by this effective date.",
              },
              {
                label: "Coverage",
                value: "Account + billing",
                hint: "The policy covers account, transaction, usage, and support interaction data.",
              },
              {
                label: "Rights",
                value: "Access / delete",
                hint: "Available rights depend on the laws that apply where the user lives.",
              },
              {
                label: "Contact",
                value: siteConfig.privacyEmail,
                hint: "Privacy questions and formal data requests should be sent here.",
              },
            ]}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            {PRIVACY_SECTIONS.map((section) => (
              <LegalSection key={section.title} {...section} />
            ))}

            <LegalSection
              title="9. Contact"
              className="xl:col-span-2"
              paragraphs={[
                "If you have privacy questions or need to submit a data rights request, use the contact details below.",
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
