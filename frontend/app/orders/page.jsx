import OrdersPageClient from "./OrdersPageClient";
import { createPageMetadata } from "../../lib/seo";
import { cookies } from "next/headers";
import { hasServerSessionCookie } from "../../lib/serverAdultGate";

export const metadata = createPageMetadata({
  title: "Orders",
  description: "Orders and purchases.",
  path: "/orders",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function Page() {
  const cookieStore = await cookies();
  const initialSignedIn =
    cookieStore.get("mn_is_signed_in")?.value === "1" ||
    hasServerSessionCookie(cookieStore);

  return <OrdersPageClient initialSignedIn={initialSignedIn} />;
}
