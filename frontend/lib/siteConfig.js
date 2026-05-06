function clean(value) {
  return String(value || "").trim();
}

function parseEnvFlag(keysOrKey, ...restKeys) {
  const keys = Array.isArray(keysOrKey) ? keysOrKey : [keysOrKey, ...restKeys];
  let defaultValue = false;

  if (
    keys.length > 0 &&
    typeof keys[keys.length - 1] === "object" &&
    keys[keys.length - 1] !== null &&
    !Array.isArray(keys[keys.length - 1])
  ) {
    const options = keys.pop();
    defaultValue = Boolean(options.defaultValue);
  }

  for (const key of keys) {
    const raw = clean(process.env[key]);
    if (!raw) {
      continue;
    }

    const normalized = raw.toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return defaultValue;
}

const DEFAULT_SITE_URL = "https://www.gushcomics.com";

function normalizeSiteUrl(value) {
  const raw = clean(value) || DEFAULT_SITE_URL;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const siteConfig = {
  siteName: clean(process.env.NEXT_PUBLIC_SITE_NAME) || "Gush",
  companyName: clean(process.env.NEXT_PUBLIC_COMPANY_NAME) || "Gush Comics",
  siteUrl: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  defaultDescription:
    clean(process.env.NEXT_PUBLIC_SITE_DESCRIPTION) ||
    "Read comics and novels on Gush.",
  tagline:
    clean(process.env.NEXT_PUBLIC_SITE_TAGLINE) ||
    "Comics and novels.",
  aboutSummary:
    clean(process.env.NEXT_PUBLIC_ABOUT_SUMMARY) ||
    "Gush brings comics and novels together in one reading home.",
  supportEmail: clean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) || "support@gushcomics.com",
  privacyEmail:
    clean(process.env.NEXT_PUBLIC_PRIVACY_EMAIL) ||
    clean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) ||
    "privacy@gushcomics.com",
  legalEmail:
    clean(process.env.NEXT_PUBLIC_LEGAL_EMAIL) ||
    clean(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) ||
    "legal@gushcomics.com",
  companyAddress: clean(process.env.NEXT_PUBLIC_COMPANY_ADDRESS),
  governingLaw: clean(process.env.NEXT_PUBLIC_GOVERNING_LAW),
  legalVenue: clean(process.env.NEXT_PUBLIC_LEGAL_VENUE),
  twitterUrl: clean(process.env.NEXT_PUBLIC_TWITTER_URL),
  twitterHandle: clean(process.env.NEXT_PUBLIC_TWITTER_HANDLE),
  githubUrl: clean(process.env.NEXT_PUBLIC_GITHUB_URL),
  monetization: {
    checkoutEnabled: parseEnvFlag(
      "NEXT_PUBLIC_ENABLE_CHECKOUT",
      "ENABLE_CHECKOUT",
    ),
    membershipEnabled: parseEnvFlag(
      "NEXT_PUBLIC_ENABLE_MEMBERSHIP",
      "ENABLE_MEMBERSHIP",
    ),
    pointPacksEnabled: parseEnvFlag(
      "NEXT_PUBLIC_ENABLE_POINT_PACKS",
      "ENABLE_POINT_PACKS",
    ),
  },
  navigation: {
    showCreatorsInNav: parseEnvFlag(
      "NEXT_PUBLIC_SHOW_CREATORS_IN_NAV",
      "SHOW_CREATORS_IN_NAV",
    ),
    showRankingsInNav: parseEnvFlag(
      "NEXT_PUBLIC_SHOW_RANKINGS_IN_NAV",
      "SHOW_RANKINGS_IN_NAV",
    ),
    enableMonetizationNav: parseEnvFlag(
      "NEXT_PUBLIC_ENABLE_MONETIZATION_NAV",
      "ENABLE_MONETIZATION_NAV",
    ),
  },
  matureContent: {
    enabled: parseEnvFlag(
      ["NEXT_PUBLIC_ENABLE_MATURE_CONTENT", "ENABLE_MATURE_CONTENT", { defaultValue: true }],
    ),
  },
};

siteConfig.monetization.publicCommerceNavEnabled =
  siteConfig.navigation.enableMonetizationNav &&
  (siteConfig.monetization.checkoutEnabled ||
    siteConfig.monetization.membershipEnabled ||
    siteConfig.monetization.pointPacksEnabled);

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${siteConfig.siteUrl}/`).toString();
}
