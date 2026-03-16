import CreatorsHubPage from "../../components/creators/CreatorsHubPage";
import StructuredDataScript from "../../components/common/StructuredDataScript";
import { createPageMetadata } from "../../lib/seo";
import { buildCreatorsDirectoryStructuredData } from "../../lib/structuredData";
import { loadCreatorsDirectorySeoPayload } from "../../lib/storefrontSeo";

export const revalidate = 300;

export async function generateMetadata() {
  const payload = await loadCreatorsDirectorySeoPayload();
  const leadCover = payload?.creators?.[0]?.spotlightSeries?.coverUrl || null;

  return createPageMetadata({
    title: "Creators & Studios",
    description:
      "Browse the creators and studios behind the catalog, discover multi-title teams, and find more from the same people faster.",
    path: "/creators",
    image: leadCover,
  });
}

export default async function CreatorsPageRoute() {
  const payload = await loadCreatorsDirectorySeoPayload();
  const structuredData = buildCreatorsDirectoryStructuredData({
    creators: payload?.creators || [],
  });

  return (
    <>
      <StructuredDataScript id="creators-directory-jsonld" data={structuredData} />
      <CreatorsHubPage />
    </>
  );
}
