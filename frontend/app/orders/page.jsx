import OrdersPageClient from "./OrdersPageClient";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Purchases",
  description: "See your recent point packs, memberships, and saved purchase history.",
  path: "/orders",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  return <OrdersPageClient />;
}
