import { createPageMetadata } from "../../lib/seo";
import NotificationsPageClient from "./NotificationsPageClient";

export const metadata = createPageMetadata({
  title: "Notifications",
  description: "Review chapter alerts, promotions, and voucher messages from one clean inbox.",
  path: "/notifications",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  return <NotificationsPageClient />;
}
