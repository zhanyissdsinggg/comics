function clean(value) {
  return String(value || "").trim();
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
    "Discover thousands of comics and novels. Read your favorite series online with fast pages, clean layouts, and daily updates.",
  tagline:
    clean(process.env.NEXT_PUBLIC_SITE_TAGLINE) ||
    "Comics, novels, and premium reading experiences without the clutter.",
  aboutSummary:
    clean(process.env.NEXT_PUBLIC_ABOUT_SUMMARY) ||
    "Gush is a digital reading platform focused on fast discovery, polished reading flows, and dependable access across comics and novels.",
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
  twitterUrl: clean(process.env.NEXT_PUBLIC_TWITTER_URL),
  twitterHandle: clean(process.env.NEXT_PUBLIC_TWITTER_HANDLE),
  githubUrl: clean(process.env.NEXT_PUBLIC_GITHUB_URL),
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${siteConfig.siteUrl}/`).toString();
}
