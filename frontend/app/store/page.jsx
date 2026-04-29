import { CouponProvider } from "../../store/useCouponStore";
import { createPageMetadata } from "../../lib/seo";
import { loadSubscriptionPlansSeoPayload, loadTopupCatalogSeoPayload } from "../../lib/storefrontSeo";
import { WalletProvider } from "../../store/useWalletStore";
import StorePageShell from "./StorePageShell";

export const metadata = createPageMetadata({
  title: "Store",
  description: "Get points, use codes, and check current plan savings.",
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
