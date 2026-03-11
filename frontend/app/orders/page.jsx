import OrdersPageClient from "./OrdersPageClient";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Orders & Receipts",
  description: "Review purchases, receipts, reconciliations, and refund activity.",
  path: "/orders",
});

export default function Page() {
  return <OrdersPageClient />;
}
