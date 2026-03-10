import { absoluteUrl, siteConfig } from "./siteConfig";

export const defaultSocialImage = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: `${siteConfig.companyName} preview image`,
};

export function createPageMetadata({ title, description, path = "/" }) {
  const pageTitle = title ? `${title} | ${siteConfig.siteName}` : siteConfig.siteName;
  const summary = description || siteConfig.defaultDescription;

  return {
    title,
    description: summary,
    openGraph: {
      title: pageTitle,
      description: summary,
      url: absoluteUrl(path),
      siteName: siteConfig.companyName,
      type: "website",
      locale: "en_US",
      images: [defaultSocialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: summary,
      images: [defaultSocialImage.url],
      creator: siteConfig.twitterHandle || undefined,
    },
  };
}
