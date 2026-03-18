import SupportPage from "../../components/support/SupportPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Help",
  description: "Send us a message about charges, account access, or reading problems.",
  path: "/support",
});

export default function Page() {
  return <SupportPage />;
}
