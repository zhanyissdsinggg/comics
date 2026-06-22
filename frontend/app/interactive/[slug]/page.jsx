import InteractiveStoryPage from "../../../components/interactive/InteractiveStoryPage";
import {
  getInteractiveServerAccess,
  getInteractiveStoryServer,
  getInteractiveStoryServerState,
} from "../../../lib/interactiveServerApi";
import { createPageMetadata } from "../../../lib/seo";
import { buildInteractiveLandingRobots } from "../../../lib/interactiveSeo";
export async function generateMetadata({ params }) {
  const resolved = await Promise.resolve(params);
  const slug = String(resolved?.slug || "").trim();
  const story = await getInteractiveStoryServer(slug);
  const genreText =
    Array.isArray(story?.genre) && story.genre.length > 0
      ? `${story.genre.join(", ")} interactive story on Gush.`
      : "Read a branching interactive story on Gush.";
  return createPageMetadata({
    title: story?.title || "Interactive Story",
    description: story?.description || genreText,
    path: `/interactive/${slug}`,
    robots: buildInteractiveLandingRobots(),
  });
}

export default async function InteractiveStoryDetailPage({ params }) {
  const resolved = await Promise.resolve(params);
  const slug = String(resolved?.slug || "").trim();
  const [storyState, access] = await Promise.all([
    getInteractiveStoryServerState(slug),
    getInteractiveServerAccess(),
  ]);

  return (
    <InteractiveStoryPage
      storySlug={slug}
      initialStory={storyState.story}
      initialAccessState={storyState.accessState}
      initialContentMode={access.contentMode}
      mode="detail"
    />
  );
}
