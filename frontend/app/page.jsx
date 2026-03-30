import HomePage from "../components/home/HomePage";
import StructuredDataScript from "../components/common/StructuredDataScript";
import { createPageMetadata } from "../lib/seo";
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
} from "../lib/structuredData";
import { loadHomepageSeoPayload } from "../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Read Comics and Novels Online | Gush",
  description:
    "Original comics and serialized novels, curated for calm, focused reading in one place.",
  path: "/",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const initialHomeData = await loadHomepageSeoPayload();
  const structuredData = [
    buildOrganizationStructuredData(),
    buildWebsiteStructuredData({
      description:
        "Original comics and serialized novels, curated for calm, focused reading in one place.",
    }),
  ];

  return (
    <>
      <StructuredDataScript id="home-jsonld" data={structuredData} />
      <HomePage initialSearchParams={initialSearchParams} initialHomeData={initialHomeData} />
    </>
  );
}
