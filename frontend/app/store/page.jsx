import StorePageLoader from "./StorePageLoader";
import { CouponProvider } from "../../store/useCouponStore";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Store",
  description: "Review point packs, free reading options, coupon entry, and membership savings before checkout.",
  path: "/store",
});

export default function Page() {
  return (
    <CouponProvider>
      <StorePageLoader />
    </CouponProvider>
  );
}
