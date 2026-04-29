import CreatorPage from "../../../components/creators/CreatorPage";
import StructuredDataScript from "../../../components/common/StructuredDataScript";
import { createPageMetadata } from "../../../lib/seo";
import {
  buildCreatorPathFromSlug,
  humanizeCreatorSlug,
} from "../../../lib/creators";
import { siteConfig } from "../../../lib/siteConfig";
import { buildCreatorStructuredData } from "../../../lib/structuredData";
import { isBlockedPublicCreatorSlug } from "../../../lib/publicCatalogVisibility";
import { loadCreatorSeoPayload } from "../../../lib/storefrontSeo";
import { notFound } from "next/navigation";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const creatorSlug = resolvedParams?.slug;
  if (isBlockedPublicCreatorSlug(creatorSlug)) {
    return createPageMetadata({
      title: "Creators",
      description: "Writers, artists, and studios behind the stories on Gush.",
      path: "/creators",
      robots: {
        index: false,
        follow: false,
      },
    });
  }
  const creatorPayload = await loadCreatorSeoPayload(creatorSlug);
  const hasCreatorItems = Array.isArray(creatorPayload?.items) && creatorPayload.items.length > 0;
  const creatorName =
    creatorPayload?.creatorName || humanizeCreatorSlug(creatorSlug);

  return createPageMetadata({
    title: creatorName,
    description: hasCreatorItems
      ? `${creatorName} on ${siteConfig.siteName}.`
      : "Creator.",
    path: hasCreatorItems ? buildCreatorPathFromSlug(creatorSlug) : "/creators",
    image: hasCreatorItems ? creatorPayload?.items?.[0]?.coverUrl || null : null,
  });
}

export default async function CreatorRoutePage({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const creatorSlug = resolvedParams.slug;
  if (isBlockedPublicCreatorSlug(creatorSlug)) {
    notFound();
  }
  const creatorPayload = await loadCreatorSeoPayload(creatorSlug);
  if (creatorPayload?.blocked) {
    notFound();
  }
  const hasCreatorItems = Array.isArray(creatorPayload?.items) && creatorPayload.items.length > 0;

  const structuredData = buildCreatorStructuredData({
    creatorName: creatorPayload?.creatorName || humanizeCreatorSlug(creatorSlug),
    creatorPath: buildCreatorPathFromSlug(creatorSlug),
    items: hasCreatorItems ? creatorPayload.items : [],
  });

  return (
    <>
      <StructuredDataScript id={`creator-jsonld-${creatorSlug}`} data={structuredData} />
      <CreatorPage
        creatorSlug={creatorSlug}
        initialCatalog={creatorPayload?.items || []}
        hasInitialCatalog={hasCreatorItems}
      />
    </>
  );
}
