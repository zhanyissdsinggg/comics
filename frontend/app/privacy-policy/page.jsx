import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import {
  StorefrontDesk,
  StorefrontInfoCard,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
} from "../../components/common/StorefrontPagePrimitives";
import SurfacePanel from "../../components/common/SurfacePanel";
import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description: `Privacy at ${siteConfig.siteName}.`,
  path: "/privacy-policy",
});

const effectiveDate = "March 9, 2026";
const monetizationLive =
  siteConfig.monetization.checkoutEnabled ||
  siteConfig.monetization.membershipEnabled ||
  siteConfig.monetization.pointPacksEnabled;

const PRIVACY_SECTIONS = [
  {
    title: "What we collect",
    bullets: [
      "Account details like email address, sign-in identifiers, and profile preferences.",
      monetizationLive
        ? "Purchase data tied to memberships, point packs, refunds, and promo redemptions."
        : "If payments are enabled later, purchase data may include memberships, point packs, refunds, and promo redemptions.",
      "Reading and device data such as pages visited, reading progress, device type, and basic diagnostics.",
      "Messages you send us through support, feedback forms, or direct email.",
    ],
  },
  {
    title: "How we use it",
    bullets: [
      monetizationLive
        ? "Run the site, sign readers in, and process payments."
        : "Run the site, sign readers in, and support future payment features when they are enabled.",
      "Fix bugs, prevent abuse, and keep the product secure.",
      "Personalize recommendations, reading tools, and product messages.",
      "Apply mature-content settings, age checks, and device-level visibility choices when a title is marked 18+.",
      "Meet legal obligations, enforce our Terms, and respond to valid requests from authorities.",
    ],
  },
  {
    title: "Why we process and share it",
    paragraphs: [
      monetizationLive
        ? `We process information when we need it to run ${siteConfig.siteName}, honor purchases, comply with law, protect the site, or improve the product.`
        : `We process information when we need it to run ${siteConfig.siteName}, comply with law, protect the site, or improve the product. If payments are enabled later, we may also process information needed to support purchases.`,
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
    title: "Mature content controls",
    paragraphs: [
      "If a title is marked 18+, we may store age-gate confirmation and mature visibility settings on your device or account so the site can respect your current reading preferences.",
      "Hide mature history settings only affect how 18+ activity appears on the device you are using unless we explicitly say an account-level setting applies.",
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
    <SurfacePanel className={className} appearance="dark" accent="cyan">
      <h2 className="font-display text-[1.8rem] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-[1.72] text-white/72">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {bullets.length > 0 ? (
          <ul className="list-disc space-y-2 pl-5 text-white/72 marker:text-[#FF007A]">
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
    <StorefrontInfoCard title="Privacy contact">
      <p className="mt-3 text-sm text-white/68">
        <span className="font-semibold uppercase tracking-[0.08em] text-white">
          Email:
        </span>{" "}
        <a
          href={`mailto:${siteConfig.privacyEmail}`}
          className="font-semibold text-[#ff77b0] transition hover:text-[#ff9cc0]"
        >
          {siteConfig.privacyEmail}
        </a>
      </p>
      {siteConfig.companyAddress ? (
        <p className="mt-3 text-sm text-white/68">
          <span className="font-semibold uppercase tracking-[0.08em] text-white">
            Address:
          </span>{" "}
          {siteConfig.companyAddress}
        </p>
      ) : null}
    </StorefrontInfoCard>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#090b12_0%,#0f1119_34%,#13131d_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(255,79,154,0.12),transparent_20%),radial-gradient(circle_at_84%_10%,rgba(103,232,249,0.12),transparent_22%),radial-gradient(circle_at_50%_0%,rgba(167,139,250,0.08),transparent_24%)]" />
      <main className="mx-auto flex max-w-[1320px] flex-col gap-8 px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <EditorialHero
            appearance="dark"
            accent="cyan"
            eyebrow="Privacy"
            title="Privacy."
            description=""
            stats={[
              {
                label: "Effective",
                value: effectiveDate,
              },
              {
                label: "Covers",
                value: "Account + reading",
              },
            ]}
          />

          <StorefrontDesk
            eyebrow="Contact"
            title="Contact."
            actions={
              <ul className="grid gap-2.5">
                <li>
                  <a
                    href={`mailto:${siteConfig.privacyEmail}`}
                    className={storefrontPrimaryButtonClass}
                  >
                    Email privacy team
                  </a>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/45">
                    For privacy requests.
                  </p>
                </li>
                <li>
                  <Link
                    href="/support"
                    className={storefrontSecondaryButtonClass}
                  >
                    Contact support
                  </Link>
                </li>
              </ul>
            }
            description="Choose the privacy contact link you need below."
          />
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
