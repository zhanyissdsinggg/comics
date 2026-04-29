import Link from "next/link";
import { CouponProvider } from "../../store/useCouponStore";
import { createPageMetadata } from "../../lib/seo";
import { loadSubscriptionPlansSeoPayload, loadTopupCatalogSeoPayload } from "../../lib/storefrontSeo";
import { siteConfig } from "../../lib/siteConfig";
import { WalletProvider } from "../../store/useWalletStore";
import StorePageShell from "./StorePageShell";

function StorePrelaunchPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto flex max-w-[960px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <section className="rounded-[28px] border border-white/10 bg-[#0b0b0b] p-6 sm:p-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
            Store Preview
          </p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.8rem]">
            Points are coming soon
          </h1>
          <p className="mt-4 max-w-[34rem] text-sm leading-6 text-white/68">
            Point packs are not available yet. You can read free chapters now.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/comics"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              Browse Comics
            </Link>
            <Link
              href="/support"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/12 bg-white/[0.03] px-5 text-sm font-medium text-white/82 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Contact Support
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export async function generateMetadata() {
  const prelaunchStore =
    !siteConfig.monetization.checkoutEnabled ||
    !siteConfig.monetization.pointPacksEnabled;

  return createPageMetadata({
    title: prelaunchStore ? "Points are coming soon" : "Store",
    description: prelaunchStore
      ? "Point packs are not available yet. You can read free chapters now."
      : "Get points, use codes, and check current plan savings.",
    path: "/store",
    robots: prelaunchStore
      ? {
          index: false,
          follow: false,
        }
      : undefined,
  });
}

export default async function Page({ searchParams }) {
  const prelaunchStore =
    !siteConfig.monetization.checkoutEnabled ||
    !siteConfig.monetization.pointPacksEnabled;
  if (prelaunchStore) {
    return <StorePrelaunchPage />;
  }

  const initialSearchParams = (await searchParams) || {};
  const [topupPayload, subscriptionPayload] = await Promise.all([
    loadTopupCatalogSeoPayload(),
    loadSubscriptionPlansSeoPayload(),
  ]);

  return (
    <WalletProvider>
      <CouponProvider>
        <StorePageShell
          initialSearchParams={initialSearchParams}
          initialTopupCatalog={topupPayload?.packages || []}
          initialBillingAvailability={topupPayload?.billing || null}
          initialPlanCatalog={subscriptionPayload?.planCatalog || null}
        />
      </CouponProvider>
    </WalletProvider>
  );
}
