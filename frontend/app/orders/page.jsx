import OrdersPageClient from "./OrdersPageClient";
import { createPageMetadata } from "../../lib/seo";
import { cookies } from "next/headers";

export const metadata = createPageMetadata({
  title: "Orders",
  description: "See your billing history, receipts, and membership charges after sign-in.",
  path: "/orders",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function Page() {
  const cookieStore = await cookies();
  const initialSignedIn = cookieStore.get("mn_is_signed_in")?.value === "1";

  return <OrdersPageClient initialSignedIn={initialSignedIn} />;
}
