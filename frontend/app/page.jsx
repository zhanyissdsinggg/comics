import HomePage from "../components/home/HomePage";
import StructuredDataScript from "../components/common/StructuredDataScript";
import { createPageMetadata } from "../lib/seo";
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
} from "../lib/structuredData";
import { loadHomepageSeoPayload } from "../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Read Comics and Novels Online",
  description:
    "Read comics and novels on Gush. Start free, unlock with points, or choose a membership plan.",
  path: "/",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const initialHomeData = await loadHomepageSeoPayload();
  const structuredData = [
    buildOrganizationStructuredData(),
    buildWebsiteStructuredData({
      description:
        "Read comics and novels on Gush. Start free, unlock with points, or choose a membership plan.",
    }),
  ];

  return (
    <>
      <StructuredDataScript id="home-jsonld" data={structuredData} />
      <HomePage initialSearchParams={initialSearchParams} initialHomeData={initialHomeData} />
    </>
  );
}
