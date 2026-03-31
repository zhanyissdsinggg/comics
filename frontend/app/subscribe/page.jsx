import SubscribePage from "../../components/subscribe/SubscribePage";
import { createPageMetadata } from "../../lib/seo";
import { loadSubscriptionPlansSeoPayload } from "../../lib/storefrontSeo";
import { WalletProvider } from "../../store/useWalletStore";

export const metadata = createPageMetadata({
  title: "Membership",
  description: "Compare monthly membership options, recurring billing, perks, cancellation details, and billing help.",
  path: "/subscribe",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const payload = await loadSubscriptionPlansSeoPayload();

  return (
    <WalletProvider>
      <SubscribePage
        initialSearchParams={initialSearchParams}
        initialPlanCatalog={payload?.planCatalog || null}
        initialBillingAvailability={payload?.billing || null}
      />
    </WalletProvider>
  );
}
