import InteractiveStoryPage from "../../../components/interactive/InteractiveStoryPage";
import { createPageMetadata } from "../../../lib/seo";
import { buildInteractiveLandingRobots } from "../../../lib/interactiveSeo";
export async function generateMetadata({ params }) {
  const resolved = await Promise.resolve(params);
  const slug = String(resolved?.slug || "").trim();
  return createPageMetadata({
    title: "Interactive Story",
    description: "Read a branching interactive story on Gush.",
    path: `/interactive/${slug}`,
    robots: buildInteractiveLandingRobots(),
  });
}

export default async function InteractiveStoryDetailPage({ params }) {
  const resolved = await Promise.resolve(params);
  const slug = String(resolved?.slug || "").trim();

  return (
    <InteractiveStoryPage
      storySlug={slug}
      mode="detail"
    />
  );
}
