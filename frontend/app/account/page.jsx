import AccountPageClient from "./AccountPageClient";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Account Settings",
  description: "Manage your profile, security options, subscriptions, and reading preferences.",
  path: "/account",
});

export default function Page() {
  return <AccountPageClient />;
}
