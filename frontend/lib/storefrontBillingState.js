export function resolvePublicCommerceMode(billingAvailability, actionKey) {
  const billingMode = String(billingAvailability?.billingMode || "")
    .trim()
    .toLowerCase();
  const actionEnabled = billingAvailability?.[actionKey] === true;
  const isRealCommerceLive = billingMode === "provider" && actionEnabled;

  return {
    billingMode,
    isRealCommerceLive,
    isPrelaunch: !isRealCommerceLive,
  };
}
