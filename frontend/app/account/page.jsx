import { cookies } from "next/headers";
import AccountPageClient from "./AccountPageClient";
import { createPageMetadata } from "../../lib/seo";

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
  const initialSignedIn = cookieStore.get("mn_is_signed_in")?.value === "1";

  return <AccountPageClient initialSignedIn={initialSignedIn} />;
}
