import InteractiveStoryPage from "../../../components/interactive/InteractiveStoryPage";
import {
  getInteractiveServerAccess,
  getInteractiveStoryServer,
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
  const [story, access] = await Promise.all([
    getInteractiveStoryServer(slug),
    getInteractiveServerAccess(),
  ]);

  return (
    <InteractiveStoryPage
      storySlug={slug}
      initialStory={story}
      initialContentMode={access.contentMode}
      mode="detail"
    />
  );
}
