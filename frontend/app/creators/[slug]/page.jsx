import CreatorPage from "../../../components/creators/CreatorPage";
import StructuredDataScript from "../../../components/common/StructuredDataScript";
import { createPageMetadata } from "../../../lib/seo";
import {
  buildCreatorPathFromSlug,
  humanizeCreatorSlug,
} from "../../../lib/creators";
import { siteConfig } from "../../../lib/siteConfig";
import { buildCreatorStructuredData } from "../../../lib/structuredData";
import { loadCreatorSeoPayload } from "../../../lib/storefrontSeo";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const creatorSlug = resolvedParams?.slug;
  const creatorPayload = await loadCreatorSeoPayload(creatorSlug);
  const hasCreatorItems = Array.isArray(creatorPayload?.items) && creatorPayload.items.length > 0;
  const creatorName =
    hasCreatorItems ? creatorPayload?.creatorName || humanizeCreatorSlug(creatorSlug) : "Behind the Stories";

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
  const creatorPayload = await loadCreatorSeoPayload(creatorSlug);
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
