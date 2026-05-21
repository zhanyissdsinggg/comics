import { cookies } from "next/headers";
import AccountPageClient from "./AccountPageClient";
import { createPageMetadata } from "../../lib/seo";
import { hasServerSessionCookie } from "../../lib/serverAdultGate";

export const metadata = createPageMetadata({
  title: "Account",
  description: "Manage your account, plans, orders, and reading settings.",
  path: "/account",
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

  return <AccountPageClient initialSignedIn={initialSignedIn} />;
}
