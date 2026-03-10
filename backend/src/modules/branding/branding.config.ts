export const BRANDING_CONFIG_KEY = "branding";

export interface BrandingConfig {
  siteLogoUrl: string;
  faviconUrl: string;
  homeBannerUrl: string;
  updatedAt: string | null;
}

export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  siteLogoUrl: "",
  faviconUrl: "",
  homeBannerUrl:
    "https://img2.baidu.com/it/u=2690835672,2180416117&fm=253&fmt=auto&app=138&f=JPEG?w=889&h=500",
  updatedAt: null,
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeBrandingConfig(input: unknown): BrandingConfig {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const homeBannerUrl = readString(source.homeBannerUrl) || DEFAULT_BRANDING_CONFIG.homeBannerUrl;

  return {
    siteLogoUrl: readString(source.siteLogoUrl),
    faviconUrl: readString(source.faviconUrl),
    homeBannerUrl,
    updatedAt: readString(source.updatedAt) || null,
  };
}

export function buildBrandingPayload(input: unknown): BrandingConfig {
  return {
    ...normalizeBrandingConfig(input),
    updatedAt: new Date().toISOString(),
  };
}
