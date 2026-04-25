import { redirect } from "next/navigation";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Sign In",
  description: "Sign in to Gush.",
  path: "/signin",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function SignInPage({ searchParams }) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const returnTo = Array.isArray(resolvedSearchParams?.returnTo)
    ? resolvedSearchParams.returnTo[0]
    : resolvedSearchParams?.returnTo;
  const href = returnTo
    ? `/?openLogin=1&returnTo=${encodeURIComponent(String(returnTo))}`
    : "/?openLogin=1";

  redirect(href);
}
