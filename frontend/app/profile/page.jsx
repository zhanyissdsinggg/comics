import { redirect } from "next/navigation";

export const metadata = {
  title: "Profile",
  description: "Profile entry redirects to the account center.",
};

export default function Page() {
  redirect("/account");
}
