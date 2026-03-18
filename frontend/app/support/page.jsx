import SupportPage from "../../components/support/SupportPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Support",
  description: "Get help with billing, sign-in, reading issues, mature-content access, and purchase questions.",
  path: "/support",
});

export default function Page() {
  return <SupportPage />;
}
