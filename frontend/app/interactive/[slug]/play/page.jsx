import InteractiveStoryPage from "../../../../components/interactive/InteractiveStoryPage";
import { createPageMetadata } from "../../../../lib/seo";
import { buildInteractiveLandingRobots } from "../../../../lib/interactiveSeo";

export async function generateMetadata({ params }) {
  const resolved = await Promise.resolve(params);
  const slug = String(resolved?.slug || "").trim();

  return createPageMetadata({
    title: "Interactive Story Play",
    description: "Play through a branching interactive story on Gush.",
    path: `/interactive/${slug}/play`,
    robots: buildInteractiveLandingRobots(),
  });
}

export default async function InteractiveStoryPlayPage({ params }) {
  const resolved = await Promise.resolve(params);
  const slug = String(resolved?.slug || "").trim();

  return (
    <InteractiveStoryPage
      storySlug={slug}
      mode="play"
    />
  );
}
