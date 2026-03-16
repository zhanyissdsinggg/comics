import dynamic from "next/dynamic";
import Script from "next/script";
import { Fraunces, Geist, Manrope } from "next/font/google";
import "./globals.css";
import AppProviders from "../components/layout/AppProviders";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { defaultSocialImage } from "../lib/seo";
import { siteConfig } from "../lib/siteConfig";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const CookieConsent = dynamic(() => import("../components/common/CookieConsent"));

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const defaultTitle = `${siteConfig.siteName} - Read Comics and Novels Online`;

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

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
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(bodyFont.variable, displayFont.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-screen bg-neutral-950 font-sans text-neutral-100 antialiased">
        {GOOGLE_CLIENT_ID ? (
          <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        ) : null}
        <ErrorBoundary name="RootBoundary">
          <AppProviders>{children}</AppProviders>
          <CookieConsent />
        </ErrorBoundary>
      </body>
    </html>
  );
}
