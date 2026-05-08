import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdultHubPage from "../../components/adult/AdultHubPage";
import { createPageMetadata } from "../../lib/seo";

export const metadata = createPageMetadata({
  title: "Mature Catalog",
  description: "18+ mature catalog access.",
  path: "/adult",
  robots: {
    index: false,
    follow: false,
  },
});

export default async function Page() {
  const cookieStore = await cookies();
  const isSignedIn =
    String(cookieStore.get("mn_is_signed_in")?.value || "").trim() === "1";
  const adultConfirmed =
    String(cookieStore.get("mn_adult_confirmed")?.value || "").trim() === "1";
  const matureModeEnabled =
    String(cookieStore.get("mn_adult_mode")?.value || "").trim() === "1";

  if (!isSignedIn) {
    redirect("/adult-gate?reason=NEED_LOGIN&returnTo=%2Fadult");
  }

  if (!adultConfirmed) {
    redirect("/adult-gate?reason=NEED_AGE_CONFIRM&returnTo=%2Fadult");
  }

  if (!matureModeEnabled) {
    redirect("/adult-gate?reason=NEED_ADULT_MODE&returnTo=%2Fadult");
  }

  return <AdultHubPage />;
}
