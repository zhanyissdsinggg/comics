export const REGION_CONFIG = {
  global: {
    label: "Global",
    legalAge: 18,
    currencySymbol: "$",
    pointsPackages: {
      starter: { priceLabel: "$3.99" },
      medium: { priceLabel: "$7.99" },
      value: { priceLabel: "$14.99" },
      mega: { priceLabel: "$29.99" },
    },
    taxHint: "Tax may apply at checkout.",
  },
  kr: {
    label: "Korea",
    legalAge: 19,
    currencySymbol: "₩",
    pointsPackages: {
      starter: { priceLabel: "₩4,500" },
      medium: { priceLabel: "₩9,900" },
      value: { priceLabel: "₩19,900" },
      mega: { priceLabel: "₩39,000" },
    },
    taxHint: "VAT included where applicable.",
  },
  us: {
    label: "United States",
    legalAge: 21,
    currencySymbol: "$",
    pointsPackages: {
      starter: { priceLabel: "$4.99" },
      medium: { priceLabel: "$9.99" },
      value: { priceLabel: "$18.99" },
      mega: { priceLabel: "$34.99" },
    },
    taxHint: "Tax calculated at checkout.",
  },
};

export const REGION_KEYS = Object.keys(REGION_CONFIG);

export const LANGUAGE_OPTIONS = [
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
  { id: "ko", label: "한국어" },
];

export function getRegionConfig(region) {
  return REGION_CONFIG[region] || REGION_CONFIG.global;
}
