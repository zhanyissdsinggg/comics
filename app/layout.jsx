import "./globals.css";
import AppProviders from "../components/layout/AppProviders";
import { PerformanceMonitor } from "../lib/performance";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata = {
  title: {
    default: "Tappytoon",
    template: "%s | Tappytoon",
  },
  description: "Read comics and novels on Tappytoon.",
  openGraph: {
    title: "Tappytoon",
    description: "Read comics and novels on Tappytoon.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PerformanceMonitor>
          <AppProviders>{children}</AppProviders>
        </PerformanceMonitor>
        <SpeedInsights />
      </body>
    </html>
  );
}
