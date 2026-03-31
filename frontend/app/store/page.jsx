import { CouponProvider } from "../../store/useCouponStore";
import { createPageMetadata } from "../../lib/seo";
import { loadSubscriptionPlansSeoPayload, loadTopupCatalogSeoPayload } from "../../lib/storefrontSeo";
import { WalletProvider } from "../../store/useWalletStore";
import StorePageShell from "./StorePageShell";

export const metadata = createPageMetadata({
  title: "Store",
  description: "Review point packs, free reading options, coupon entry, and membership savings before checkout.",
  path: "/store",
});

export default async function Page({ searchParams }) {
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
