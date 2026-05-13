import { createPageMetadata } from "../../lib/seo";
import FigmaNotificationsPage from "../../components/figma/FigmaNotificationsPage";

export const metadata = createPageMetadata({
  title: "Notifications",
  description:
    "Review chapter alerts, promotions, and voucher messages from one clean inbox.",
  path: "/notifications",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  return <FigmaNotificationsPage />;
}
