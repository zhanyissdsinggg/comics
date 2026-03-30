export const US_STOREFRONT_CURRENCY = "USD";

const US_STOREFRONT_CURRENCY_SET = new Set([US_STOREFRONT_CURRENCY]);

export function normalizeUsStorefrontCurrencyCode(value: unknown): string {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (US_STOREFRONT_CURRENCY_SET.has(normalized)) {
    return normalized;
  }

  return US_STOREFRONT_CURRENCY;
}
