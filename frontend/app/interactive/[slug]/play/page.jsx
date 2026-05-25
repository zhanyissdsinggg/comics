import InteractiveStoryPage from "../../../../components/interactive/InteractiveStoryPage";
import { buildNoIndexRobots, createPageMetadata } from "../../../../lib/seo";

export const metadata = createPageMetadata({
  title: "Play Interactive Story",
  description: "Read and choose the next branch in an interactive story on Gush.",
  path: "/interactive",
  robots: buildNoIndexRobots({ follow: true }),
});

export default async function InteractiveStoryPlayRoute({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const slug = String(resolvedParams?.slug || "").trim();
  return <InteractiveStoryPage slug={slug} />;
}
