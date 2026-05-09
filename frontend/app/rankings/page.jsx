import FigmaHomePage from "../../components/figma/FigmaHomePage";
import { createPageMetadata } from "../../lib/seo";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";

export const metadata = createPageMetadata({
  title: "Trending Stories",
  description: "Trending titles, top picks, and finished series on Gush.",
  path: "/rankings",
});

export default async function Page() {
  const payload = await loadSeriesCatalogSeoPayload({ includeAdult: false });

  return <FigmaHomePage seriesList={payload?.series || []} />;
}
