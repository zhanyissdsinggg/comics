import InteractiveStoryPage from "../../../../components/interactive/InteractiveStoryPage";
import {
  getInteractiveProgressServer,
  getInteractiveServerAccess,
  getInteractiveStoryServer,
} from "../../../../lib/interactiveServerApi";
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
  const [story, progress, access] = await Promise.all([
    getInteractiveStoryServer(slug),
    getInteractiveProgressServer(slug),
    getInteractiveServerAccess(),
  ]);

  return (
    <InteractiveStoryPage
      storySlug={slug}
      initialStory={story}
      initialProgress={progress}
      initialContentMode={access.contentMode}
      mode="play"
    />
  );
}
