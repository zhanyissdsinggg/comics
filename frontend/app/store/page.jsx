import { CouponProvider } from "../../store/useCouponStore";
import { createPageMetadata } from "../../lib/seo";
import StorePage from "../../components/store/StorePage";
import { loadSubscriptionPlansSeoPayload, loadTopupCatalogSeoPayload } from "../../lib/storefrontSeo";

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
    <CouponProvider>
      <StorePage
        initialSearchParams={initialSearchParams}
        initialTopupCatalog={topupPayload?.packages || []}
        initialBillingAvailability={topupPayload?.billing || null}
        initialPlanCatalog={subscriptionPayload?.planCatalog || null}
      />
    </CouponProvider>
  );
}
