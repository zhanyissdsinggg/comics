import AccountPageClient from "./AccountPageClient";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Account",
  description: "Manage your account, membership, purchases, and reading preferences.",
  path: "/account",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  return <AccountPageClient />;
}
