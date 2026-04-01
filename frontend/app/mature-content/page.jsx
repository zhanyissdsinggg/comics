import Link from "next/link";
import EditorialHero from "../../components/common/EditorialHero";
import StructuredDataScript from "../../components/common/StructuredDataScript";
import SurfacePanel from "../../components/common/SurfacePanel";
import SiteHeader from "../../components/layout/SiteHeader";
import { createPageMetadata } from "../../lib/seo";
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
} from "../../lib/structuredData";
import { siteConfig } from "../../lib/siteConfig";

export const metadata = createPageMetadata({
  title: "Mature Content",
  description:
    "See how 18+ access, age checks, and visibility controls work on Gush.",
  path: "/mature-content",
});

const FAQ_ITEMS = [
  {
    question: "What counts as mature content on Gush?",
    answer:
      "Mature content means titles that stay hidden until 18+ access is turned on and the required age check is complete.",
  },
  {
    question: "Who needs to complete an age check?",
    answer:
      "Readers who want the 18+ catalog may need to sign in and confirm age for the current region.",
  },
  {
    question: "What does Hide 18+ history do?",
    answer:
      "It hides mature titles from visible reading history on the account or device where it is turned on.",
  },
  {
    question: "Can region settings change what I see?",
    answer:
      "Yes. Mature-content rules and age thresholds can depend on your region setting.",
  },
  {
    question: "What if age check fails or 18+ titles still look hidden?",
    answer:
      "Try the age check again, confirm your region in Account, and contact Support if access still looks wrong.",
  },
];

const CONTROL_CARDS = [
  {
    title: "Turn mature content on or off",
    body:
      "Use the 18+ toggle in the site header when you want access, then turn it off again when you do not.",
  },
  {
    title: "Confirm age for your region",
    body:
      "The site can ask for a one-time age confirmation based on your current region settings.",
  },
  {
    title: "Hide 18+ history",
    body:
      "Use the account setting if you do not want mature history visible in the normal account view on that device.",
  },
  {
    title: "Get help when access looks wrong",
    body:
      "If the mature catalog stays hidden after sign-in and age confirmation, Support can help.",
  },
];

export default function MatureContentPage() {
  const structuredData = [
    buildBreadcrumbStructuredData([
      { name: "Home", path: "/" },
      { name: "Mature Content", path: "/mature-content" },
    ]),
    buildFaqStructuredData({
      path: "/mature-content",
      name: `Mature Content | ${siteConfig.siteName}`,
      description:
        "See how 18+ access, region checks, and 18+ history controls work on Gush.",
      items: FAQ_ITEMS,
    }),
  ].filter(Boolean);

  return (
    <div className="relative min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(47,107,255,0.1),transparent_24%),linear-gradient(180deg,#eef2f9_0%,#f4f6fb_72%)]" />
      <StructuredDataScript id="mature-content-jsonld" data={structuredData} />
      <SiteHeader variant="light" />
      <main className="relative px-4 py-8 pb-14 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">
          <EditorialHero
            appearance="light"
            accent="blue"
            eyebrow="Mature content"
            title="How 18+ access works on Gush."
            description="Mature titles stay hidden by default. Turn them on when you want them, complete the age check, and use account controls to manage visibility."
            secondary="Age check, region rules, and visibility controls."
            stats={[
              {
                label: "Default",
                value: "Hidden",
                hint: "Mature titles stay off until you turn them on.",
              },
              {
                label: "Age check",
                value: "One-time",
                hint: "Age checks can depend on the current region.",
              },
              {
                label: "Privacy",
                value: "18+ history",
                hint: "Hide mature history in account settings.",
              },
              {
                label: "Help",
                value: "Support",
                hint: `Need help? Use ${siteConfig.supportEmail}.`,
              },
            ]}
            actions={
              <>
                <Link
                  href="/adult-gate"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Review 18+ access
                </Link>
                <Link
                  href="/support"
                  className="rounded-full border border-black/8 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  Contact support
                </Link>
              </>
            }
          />

          <section className="grid gap-4 lg:grid-cols-2">
            {CONTROL_CARDS.map((card) => (
              <SurfacePanel key={card.title} appearance="light" accent="blue">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  {card.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">{card.body}</p>
              </SurfacePanel>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  What to check
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  If a mature title is still blocked, check these first.
                </h2>
              </div>
              <ul className="space-y-3 text-sm leading-7 text-slate-600">
                <li>Sign in if the gate asks for account access.</li>
                <li>Confirm the age check for your current region.</li>
                <li>Review the region setting in Account if the threshold looks wrong.</li>
                <li>Check whether Hide 18+ history is changing what appears in your account view.</li>
                <li>If access still looks wrong, contact Support and name the page or title.</li>
              </ul>
            </SurfacePanel>

            <SurfacePanel className="space-y-5" appearance="light" accent="blue">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Related pages
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  Start here.
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  {
                    href: "/account",
                    title: "Account settings",
                    body: "Check region, language, and 18+ history settings.",
                  },
                  {
                    href: "/faq",
                    title: "FAQ",
                    body: "Quick answers on age checks and account access.",
                  },
                  {
                    href: "/support",
                    title: "Support",
                    body: "Contact us if a mature title is still missing after the age check.",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-[24px] border border-black/8 bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:border-black/12 hover:bg-[#fbfcff]"
                  >
                    <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.body}</p>
                  </Link>
                ))}
              </div>
            </SurfacePanel>
          </section>

          <SurfacePanel className="space-y-5" appearance="light" accent="blue">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Quick answers
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                Common questions.
              </h2>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="rounded-[24px] border border-black/8 bg-white px-5 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                >
                  <h3 className="text-base font-semibold text-slate-950">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </div>
      </main>
    </div>
  );
}
