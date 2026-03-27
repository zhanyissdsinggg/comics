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

  return createPageMetadata({
    title: "Creators",
    description:
      "Meet the writers, artists, and studios behind the stories on Gush.",
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
  const initialCatalog =
    creatorCatalog.length > 0 ? creatorCatalog : catalogPayload?.series || [];
  const structuredData = buildCreatorsDirectoryStructuredData({
    creators: payload?.creators || [],
  });

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
