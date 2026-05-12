import { cache } from "react";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import {
  loadSubscriptionPlansSeoPayload,
  loadTopupCatalogSeoPayload,
} from "../../lib/storefrontSeo";
import { siteConfig } from "../../lib/siteConfig";
import StorePageShell from "./StorePageShell";

const loadStorePagePayload = cache(async () => {
  const [topupPayload, subscriptionPayload] = await Promise.all([
    loadTopupCatalogSeoPayload(),
    loadSubscriptionPlansSeoPayload(),
  ]);
  const prelaunchStoreByConfig =
    !siteConfig.monetization.checkoutEnabled ||
    !siteConfig.monetization.pointPacksEnabled;
  const prelaunchStoreByBilling = topupPayload?.billing?.purchaseActionsEnabled !== true;

  return {
    topupPayload,
    subscriptionPayload,
    prelaunchStore: prelaunchStoreByConfig || prelaunchStoreByBilling,
  };
});

export async function generateMetadata() {
  const { prelaunchStore } = await loadStorePagePayload();

  return createPageMetadata({
    title: prelaunchStore ? "Points are coming soon" : "Store",
    description: prelaunchStore
      ? "Point packs are not available yet. You can read free chapters now."
      : "Get points, use codes, and check current plan savings.",
    path: "/store",
    robots: prelaunchStore ? buildNoIndexRobots({ follow: false }) : undefined,
  });
}

export default async function Page() {
  const { topupPayload, subscriptionPayload, prelaunchStore } =
    await loadStorePagePayload();

  return (
    <StorePageShell
      packages={topupPayload?.packages || []}
      billingAvailability={topupPayload?.billing || null}
      planCatalog={subscriptionPayload?.planCatalog || null}
      prelaunchStore={prelaunchStore}
    />
  );
}
