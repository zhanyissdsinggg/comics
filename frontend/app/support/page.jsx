import SupportPage from "../../components/support/SupportPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Support & Contact",
  description: "Reach support, submit ticket details, and find the fastest way to get a reply.",
  path: "/support",
});

export default function Page() {
  return <SupportPage />;
}
