import CreatorsHubPage from "../../components/creators/CreatorsHubPage";
import StructuredDataScript from "../../components/common/StructuredDataScript";
import { createPageMetadata } from "../../lib/seo";
import { buildCreatorsDirectoryStructuredData } from "../../lib/structuredData";
import {
  loadCreatorsDirectorySeoPayload,
  loadSeriesCatalogSeoPayload,
} from "../../lib/storefrontSeo";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const payload = await loadCreatorsDirectorySeoPayload();
  const leadCover = payload?.creators?.[0]?.spotlightSeries?.coverUrl || null;
  const hasRealCreators = Array.isArray(payload?.creators) && payload.creators.length > 0;

  return createPageMetadata({
    title: hasRealCreators ? "Creators" : "Behind the Stories",
    description: hasRealCreators
      ? "Meet the writers, artists, and studios behind the stories on Gush."
      : "Start with the stories first while public creator credits are added title by title.",
    path: "/creators",
    image: leadCover,
  });
}

export default async function CreatorsPageRoute() {
  const [payload, catalogPayload] = await Promise.all([
    loadCreatorsDirectorySeoPayload(),
    loadSeriesCatalogSeoPayload(),
  ]);
  const creatorCatalog = (payload?.creators || []).flatMap((creator) =>
    Array.isArray(creator?.series) ? creator.series : [],
  );
  const hasRealCreators = creatorCatalog.length > 0;
  const initialCatalog =
    creatorCatalog.length > 0 ? creatorCatalog : catalogPayload?.series || [];
  const structuredData = hasRealCreators
    ? buildCreatorsDirectoryStructuredData({
        creators: payload?.creators || [],
      })
    : [];

  return (
    <>
      <StructuredDataScript id="creators-directory-jsonld" data={structuredData} />
      <CreatorsHubPage
        initialCatalog={initialCatalog}
        hasInitialCatalog={Boolean(
          (payload?.ready === true && creatorCatalog.length > 0) ||
            (catalogPayload?.ready === true && initialCatalog.length > 0)
        )}
      />
    </>
  );
}
