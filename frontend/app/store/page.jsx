import StorePageLoader from "./StorePageLoader";
import { CouponProvider } from "../../store/useCouponStore";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Store & Buy Points",
  description: "Buy points, redeem coupons, and review subscriber savings before checkout.",
  path: "/store",
});

export default function Page() {
  return (
    <CouponProvider>
      <StorePageLoader />
    </CouponProvider>
  );
}
