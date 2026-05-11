import { absoluteUrl, siteConfig } from "./siteConfig";

export const defaultSocialImage = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: `${siteConfig.companyName} preview image`,
};

function resolveSocialImage(image) {
  if (!image) {
    return defaultSocialImage;
  }

  if (typeof image === "string") {
    return {
      ...defaultSocialImage,
      url: /^https?:\/\//i.test(image) ? image : absoluteUrl(image),
    };
  }

  if (typeof image === "object" && image.url) {
    return {
      ...defaultSocialImage,
      ...image,
      url: /^https?:\/\//i.test(String(image.url)) ? String(image.url) : absoluteUrl(String(image.url)),
    };
  }

  return defaultSocialImage;
}

export function buildIndexRobots({ follow = true } = {}) {
  return {
    index: true,
    follow,
    googleBot: {
      index: true,
      follow,
    },
  };
}

export function buildNoIndexRobots({ follow = false } = {}) {
  return {
    index: false,
    follow,
    googleBot: {
      index: false,
      follow,
    },
  };
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  image = null,
  openGraphType = "website",
  robots = undefined,
}) {
  const pageTitle = title ? `${title} | ${siteConfig.siteName}` : siteConfig.siteName;
  const summary = description || siteConfig.defaultDescription;
  const socialImage = resolveSocialImage(image);

  return {
    title,
    description: summary,
    ...(robots ? { robots } : {}),
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      title: pageTitle,
      description: summary,
      url: absoluteUrl(path),
      siteName: siteConfig.companyName,
      type: openGraphType,
      locale: "en_US",
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: summary,
      images: [socialImage.url],
      creator: siteConfig.twitterHandle || undefined,
    },
  };
}
