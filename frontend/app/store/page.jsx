import { CouponProvider } from "../../store/useCouponStore";
import { createPageMetadata } from "../../lib/seo";
import StorePage from "../../components/store/StorePage";
import { loadTopupCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Store",
  description: "Review point packs, free reading options, coupon entry, and membership savings before checkout.",
  path: "/store",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const payload = await loadTopupCatalogSeoPayload();

  return (
    <CouponProvider>
      <StorePage
        initialSearchParams={initialSearchParams}
        initialTopupCatalog={payload?.packages || []}
        initialBillingAvailability={payload?.billing || null}
      />
    </CouponProvider>
  );
}
