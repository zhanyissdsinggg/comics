import { createPageMetadata } from "../../lib/seo";
import NotificationsPageClient from "./NotificationsPageClient";

export const metadata = createPageMetadata({
  title: "Notifications",
  description: "Review episode alerts, promotions, and voucher messages from one clean inbox.",
  path: "/notifications",
});

export default function Page() {
  return <NotificationsPageClient />;
}
