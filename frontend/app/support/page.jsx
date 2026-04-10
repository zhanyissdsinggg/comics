import SupportPage from "../../components/support/SupportPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Support",
  description:
    "Billing, sign-in, reading, mature-content, and purchase support.",
  path: "/support",
});

export default function Page() {
  return <SupportPage />;
}
