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
  const creatorName =
    creatorPayload?.creatorName || humanizeCreatorSlug(creatorSlug);

  return createPageMetadata({
    title: `Creator: ${creatorName}`,
    description: `Browse titles from ${creatorName} on ${siteConfig.siteName}. Find the best place to start and discover more from the same creator.`,
    path: buildCreatorPathFromSlug(creatorSlug),
    image: creatorPayload?.items?.[0]?.coverUrl || null,
  });
}

export default async function CreatorRoutePage({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const creatorSlug = resolvedParams.slug;
  const creatorPayload = await loadCreatorSeoPayload(creatorSlug);
  const structuredData = buildCreatorStructuredData({
    creatorName: creatorPayload?.creatorName || humanizeCreatorSlug(creatorSlug),
    creatorPath: buildCreatorPathFromSlug(creatorSlug),
    items: creatorPayload?.items || [],
  });

  return (
    <>
      <StructuredDataScript id={`creator-jsonld-${creatorSlug}`} data={structuredData} />
      <CreatorPage creatorSlug={creatorSlug} />
    </>
  );
}
