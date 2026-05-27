import StructuredDataScript from "../components/common/StructuredDataScript";
import HomeLandingPage from "../components/storefront/HomeLandingPage";
import { buildNoIndexRobots, createPageMetadata } from "../lib/seo";
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
} from "../lib/structuredData";
import { isServerAdultModeEnabled } from "../lib/serverAdultGate";
import { loadHomepageSeoPayload } from "../lib/storefrontSeo";

export async function generateMetadata() {
  const includeAdult = await isServerAdultModeEnabled();

  return createPageMetadata({
    title: "Trending Comics, Novels, and Interactive Stories | Gush",
    description:
      "Trending comics, novels, and interactive stories. Pick something good and start reading.",
    path: "/",
    robots: includeAdult ? buildNoIndexRobots({ follow: false }) : undefined,
  });
}

export default async function Page({ searchParams }) {
  const includeAdult = await isServerAdultModeEnabled();
  const initialHomeData = await loadHomepageSeoPayload({ includeAdult });
  const structuredData = [
    buildOrganizationStructuredData(),
    buildWebsiteStructuredData({
      description:
        "Trending comics, novels, and interactive stories. Pick something good and start reading.",
    }),
  ];

  return (
    <>
      <StructuredDataScript id="home-jsonld" data={structuredData} />
      <HomeLandingPage
        initialSearchParams={(await searchParams) || {}}
        initialHomeData={initialHomeData}
      />
    </>
  );
}
