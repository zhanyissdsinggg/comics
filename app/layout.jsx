import "./globals.css";
import AppProviders from "../components/layout/AppProviders";

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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
