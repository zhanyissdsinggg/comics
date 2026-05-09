import { CouponProvider } from "../../store/useCouponStore";
import { WalletProvider } from "../../store/useWalletStore";
import FigmaStorePage from "../../components/figma/FigmaStorePage";
import { createPageMetadata } from "../../lib/seo";
import {
  loadSubscriptionPlansSeoPayload,
  loadTopupCatalogSeoPayload,
} from "../../lib/storefrontSeo";
import { siteConfig } from "../../lib/siteConfig";

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

export default async function Page() {
  const [topupPayload, subscriptionPayload] = await Promise.all([
    loadTopupCatalogSeoPayload(),
    loadSubscriptionPlansSeoPayload(),
  ]);

  return (
    <WalletProvider>
      <CouponProvider>
        <FigmaStorePage
          packages={topupPayload?.packages || []}
          billingAvailability={topupPayload?.billing || null}
          planCatalog={subscriptionPayload?.planCatalog || null}
        />
      </CouponProvider>
    </WalletProvider>
  );
}
