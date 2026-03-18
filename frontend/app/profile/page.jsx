import { redirect } from "next/navigation";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Profile",
  description: "Profile entry redirects to the account center.",
  path: "/profile",
  robots: {
    index: false,
    follow: false,
  },
});

export default function Page() {
  redirect("/account");
}
