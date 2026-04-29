import HomePage from "../components/home/HomePage";
import StructuredDataScript from "../components/common/StructuredDataScript";
import { createPageMetadata } from "../lib/seo";
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
} from "../lib/structuredData";
import { loadHomepageSeoPayload } from "../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Trending Comics, Novels, and Interactive Stories | Gush",
  description:
    "Trending comics, novels, and interactive stories. Pick something good and start reading.",
  path: "/",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const initialHomeData = await loadHomepageSeoPayload();
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
      <HomePage initialSearchParams={initialSearchParams} initialHomeData={initialHomeData} />
    </>
  );
}
