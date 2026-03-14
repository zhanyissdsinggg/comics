import { buildError, ERROR_CODES } from "./errors";

export const BILLING_MODES = {
  DEMO: "demo",
  PROVIDER: "provider",
} as const;

export type BillingMode = (typeof BILLING_MODES)[keyof typeof BILLING_MODES];

export type PublicBillingAvailability = {
  billingMode: BillingMode;
  purchaseActionsEnabled: boolean;
  subscriptionActionsEnabled: boolean;
  refundActionsEnabled: boolean;
};

export function getBillingMode(): BillingMode {
  const explicitMode = String(process.env.BILLING_MODE || "")
    .trim()
    .toLowerCase();

  if (explicitMode === BILLING_MODES.DEMO || explicitMode === BILLING_MODES.PROVIDER) {
    return explicitMode;
  }

  return process.env.NODE_ENV === "production" ? BILLING_MODES.PROVIDER : BILLING_MODES.DEMO;
}

export function isDemoBillingEnabled(): boolean {
  return getBillingMode() === BILLING_MODES.DEMO;
}

export function getPublicBillingAvailability(): PublicBillingAvailability {
  const billingMode = getBillingMode();
  const demoEnabled = billingMode === BILLING_MODES.DEMO;

  return {
    billingMode,
    purchaseActionsEnabled: demoEnabled,
    subscriptionActionsEnabled: demoEnabled,
    refundActionsEnabled: demoEnabled,
  };
}

export function buildBillingProviderRequiredError(message: string) {
  return buildError(ERROR_CODES.BILLING_PROVIDER_REQUIRED, {
    message,
    billingMode: getBillingMode(),
  });
}
