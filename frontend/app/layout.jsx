import "./globals.css";
import Script from "next/script";
import AppProviders from "../components/layout/AppProviders";
import CookieConsent from "../components/common/CookieConsent";
import ErrorBoundary from "../components/common/ErrorBoundary";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export const metadata = {
  title: {
    default: "Gush - Read Comics and Novels Online",
    template: "%s | Gush",
  },
  description:
    "Discover thousands of comics and novels on Gush. Read your favorite series online with high-quality translations. New episodes updated daily.",
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
  authors: [{ name: "Gush" }],
  creator: "Gush",
  publisher: "Gush",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://gushcomics.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Gush - Read Comics and Novels Online",
    description:
      "Discover thousands of comics and novels. Read your favorite series online with high-quality translations.",
    url: "https://gushcomics.com",
    siteName: "Gush",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Gush - Read Comics and Novels Online",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gush - Read Comics and Novels Online",
    description: "Discover thousands of comics and novels. Read your favorite series online.",
    images: ["/twitter-image.jpg"],
    creator: "@gush",
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
  verification: {
    // google: "your-google-verification-code",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
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
