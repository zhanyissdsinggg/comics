import InteractiveStoryPage from "../../../../components/interactive/InteractiveStoryPage";
import { createPageMetadata } from "../../../../lib/seo";

export const metadata = createPageMetadata({
  title: "Interactive",
  description: "Read interactive fiction with branching choices.",
  path: "/series",
  robots: {
    index: false,
    follow: true,
  },
});

export default async function SeriesInteractivePage({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const seriesId = String(resolvedParams?.id || "").trim();
  return <InteractiveStoryPage seriesId={seriesId} />;
}
