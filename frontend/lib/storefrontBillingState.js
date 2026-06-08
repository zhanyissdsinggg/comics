export function resolvePublicCommerceMode(billingAvailability, actionKey) {
  const billingMode = String(billingAvailability?.billingMode || "")
    .trim()
    .toLowerCase();
  const actionEnabled = billingAvailability?.[actionKey] === true;
  const isDemoCommerceLive = billingMode === "demo" && actionEnabled;
  const isProviderCommerceLive = billingMode === "provider" && actionEnabled;
  const isRealCommerceLive = isDemoCommerceLive || isProviderCommerceLive;

  return {
    billingMode,
    isDemoCommerceLive,
    isProviderCommerceLive,
    isRealCommerceLive,
    isPrelaunch: !isRealCommerceLive,
  };
}
