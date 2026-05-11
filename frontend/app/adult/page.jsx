import { redirect } from "next/navigation";
import AdultHubPage from "../../components/adult/AdultHubPage";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { resolveServerAdultGate } from "../../lib/serverAdultGate";

export const metadata = createPageMetadata({
  title: "Mature Catalog",
  description: "18+ mature catalog access.",
  path: "/adult",
  robots: buildNoIndexRobots({ follow: false }),
});

export default async function Page() {
  const gate = await resolveServerAdultGate();

  if (gate.reason === "NEED_LOGIN") {
    redirect("/adult-gate?reason=NEED_LOGIN&returnTo=%2Fadult");
  }

  if (gate.reason === "NEED_AGE_CONFIRM") {
    redirect("/adult-gate?reason=NEED_AGE_CONFIRM&returnTo=%2Fadult");
  }

  if (gate.reason === "NEED_ADULT_MODE") {
    redirect("/adult-gate?reason=NEED_ADULT_MODE&returnTo=%2Fadult");
  }

  return <AdultHubPage />;
}
