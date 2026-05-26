import dynamic from "next/dynamic";
import Script from "next/script";
import "./globals.css";
import AppProviders from "../components/layout/AppProviders";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { defaultSocialImage } from "../lib/seo";
import { readServerAdultGateState } from "../lib/serverAdultGate";
import { siteConfig } from "../lib/siteConfig";
import { getInteractiveNavigationAvailabilityServer } from "../lib/interactiveServerApi";

const CookieConsent = dynamic(
  () => import("../components/common/CookieConsent"),
);

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const defaultTitle = `${siteConfig.siteName} | Comics, novels, and interactive stories`;
const BUILD_REVISION =
  process.env.NEXT_PUBLIC_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "";
const BUILD_BRANCH =
  process.env.NEXT_PUBLIC_COMMIT_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GITHUB_REF_NAME ||
  "";
const BUILD_DEPLOYMENT =
  process.env.NEXT_PUBLIC_DEPLOYMENT_URL ||
  process.env.VERCEL_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  "";

export const metadata = {
  title: {
    default: defaultTitle,
    template: `%s | ${siteConfig.siteName}`,
  },
  description: siteConfig.defaultDescription,
  keywords: [
    "comics",
    "novels",
    "manga",
    "webtoon",
    "manhwa",
    "online reading",
    "digital comics",
    "web novels",
  ],
  authors: [{ name: siteConfig.companyName }],
  creator: siteConfig.companyName,
  publisher: siteConfig.companyName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteConfig.siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: defaultTitle,
    description: siteConfig.defaultDescription,
    url: siteConfig.siteUrl,
    siteName: siteConfig.companyName,
    images: [defaultSocialImage],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: siteConfig.defaultDescription,
    images: [defaultSocialImage.url],
    creator: siteConfig.twitterHandle || undefined,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "gush-build-revision": BUILD_REVISION || "unknown",
    "gush-build-branch": BUILD_BRANCH || "unknown",
    "gush-build-deployment": BUILD_DEPLOYMENT || "unknown",
  },
};

export default async function RootLayout({ children }) {
  const [initialAdultState, interactiveAvailability] = await Promise.all([
    readServerAdultGateState(),
    getInteractiveNavigationAvailabilityServer(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning className="font-sans dark">
      <body className="min-h-screen font-sans antialiased">
        <div
          hidden
          data-build-revision={BUILD_REVISION || "unknown"}
          data-build-branch={BUILD_BRANCH || "unknown"}
          data-build-deployment={BUILD_DEPLOYMENT || "unknown"}
        />
        {GOOGLE_CLIENT_ID ? (
          <Script
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
          />
        ) : null}
        <ErrorBoundary name="RootBoundary">
          <AppProviders
            initialAdultState={initialAdultState}
            initialShowInteractiveNav={interactiveAvailability.showInteractiveNav}
          >
            {children}
          </AppProviders>
          <CookieConsent />
        </ErrorBoundary>
      </body>
    </html>
  );
}
