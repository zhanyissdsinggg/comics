import "./globals.css";
import AppProviders from "../components/layout/AppProviders";
// 老王重构：CookieConsent已经移除next-intl依赖，可以正常使用了
import CookieConsent from "../components/common/CookieConsent";
import ErrorBoundary from "../components/common/ErrorBoundary";

// 老王说：完全移除next-intl，避免配置问题

// 老王添加：完整的SEO meta标签配置
export const metadata = {
  title: {
    default: "Gush - Read Comics and Novels Online",
    template: "%s | Gush",
  },
  description: "Discover thousands of comics and novels on Gush. Read your favorite series online with high-quality translations. New episodes updated daily.",
  keywords: ["comics", "novels", "manga", "webtoon", "manhwa", "online reading", "digital comics", "web novels"],
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
    description: "Discover thousands of comics and novels. Read your favorite series online with high-quality translations.",
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
    // 老王注释：添加你的Google Search Console验证码
    // google: "your-google-verification-code",
  },
};

export default function RootLayout({ children }) {
  // 老王说：使用动态导入的AppProviders，完全避免服务器端执行
  // 老王重构：CookieConsent已经移除next-intl依赖，现在可以正常使用了
  return (
    <html lang="en">
      <body>
        <ErrorBoundary name="RootBoundary">
          <AppProviders>{children}</AppProviders>
          <CookieConsent />
        </ErrorBoundary>
      </body>
    </html>
  );
}
