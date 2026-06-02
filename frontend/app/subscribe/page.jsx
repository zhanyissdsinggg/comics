import { createPageMetadata } from "../../lib/seo";
import { siteConfig } from "../../lib/siteConfig";
import { loadSubscriptionPlansSeoPayload } from "../../lib/storefrontSeo";
import { WalletProvider } from "../../store/useWalletStore";

export const metadata = createPageMetadata({
  title: siteConfig.monetization.membershipEnabled
    ? "Plans"
    : "Membership is coming soon",
  description: siteConfig.monetization.membershipEnabled
    ? "Compare plans and pricing."
    : "Plans are not available yet. You can read free chapters now.",
  path: "/subscribe",
  robots: siteConfig.monetization.membershipEnabled
    ? undefined
    : {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const payload = await loadSubscriptionPlansSeoPayload();
  const SubscribePage = (
    await import("../../components/subscribe/SubscribePage")
  ).default;

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
