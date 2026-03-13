import StorePageLoader from "./StorePageLoader";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Store & Top Up Points",
  description: "Buy points, redeem coupons, and review subscriber savings before checkout.",
  path: "/store",
});

export default function Page() {
  return <StorePageLoader />;
}
