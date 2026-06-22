import InteractiveStoryPage from "../../../../components/interactive/InteractiveStoryPage";
import {
  getInteractiveProgressServerState,
  getInteractiveServerAccess,
  getInteractiveStoryServer,
} from "../../../../lib/interactiveServerApi";
import { createPageMetadata } from "../../../../lib/seo";
import { buildNoIndexRobots } from "../../../../lib/seo";

export async function generateMetadata({ params }) {
  const resolved = await Promise.resolve(params);
  const slug = String(resolved?.slug || "").trim();
  const story = await getInteractiveStoryServer(slug);

  return createPageMetadata({
    title: `${story?.title || "Interactive Story"} Play`,
    description: story?.description || "Play through a branching interactive story on Gush.",
    path: `/interactive/${slug}/play`,
    canonicalPath: `/interactive/${slug}`,
    robots: buildNoIndexRobots({ follow: true }),
  });
}

export default async function InteractiveStoryPlayPage({ params }) {
  const resolved = await Promise.resolve(params);
  const slug = String(resolved?.slug || "").trim();
  const [story, progressState, access] = await Promise.all([
    getInteractiveStoryServer(slug),
    getInteractiveProgressServerState(slug),
    getInteractiveServerAccess(),
  ]);

  return (
    <InteractiveStoryPage
      storySlug={slug}
      initialStory={story}
      initialProgress={progressState.progress}
      initialAccessState={progressState.accessState}
      initialContentMode={access.contentMode}
      mode="play"
    />
  );
}
