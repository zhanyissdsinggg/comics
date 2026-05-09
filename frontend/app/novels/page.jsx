import FigmaHomePage from "../../components/figma/FigmaHomePage";
import { FIGMA_CONTENT_TYPES } from "../../components/figma/figma-utils";
import { createPageMetadata } from "../../lib/seo";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Novels",
  description: "Trending novels, fresh updates, and finished reads on Gush.",
  path: "/novels",
});

export default async function Page() {
  const payload = await loadSeriesCatalogSeoPayload({ includeAdult: false });

  return (
    <FigmaHomePage
      seriesList={payload?.series || []}
      initialContentType={FIGMA_CONTENT_TYPES.NOVELS}
    />
  );
}
