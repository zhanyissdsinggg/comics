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
    "Read original comics and novels in one place. Find a story, start with chapter one, and follow the series you want to keep reading.",
  path: "/",
});

export default async function Page({ searchParams }) {
  const initialSearchParams = (await searchParams) || {};
  const initialHomeData = await loadHomepageSeoPayload();
  const structuredData = [
    buildOrganizationStructuredData(),
    buildWebsiteStructuredData({
      description:
        "Read original comics and novels in one place. Find a story, start with chapter one, and follow the series you want to keep reading.",
    }),
  ];

  return (
    <>
      <StructuredDataScript id="home-jsonld" data={structuredData} />
      <HomePage initialSearchParams={initialSearchParams} initialHomeData={initialHomeData} />
    </>
  );
}
