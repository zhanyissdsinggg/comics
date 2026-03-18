import OrdersPageClient from "./OrdersPageClient";
import { createPageMetadata } from "../../lib/seo";
import { cookies } from "next/headers";

export const metadata = createPageMetadata({
  title: "Purchases",
  description: "See your recent point packs, memberships, and saved purchase history.",
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
