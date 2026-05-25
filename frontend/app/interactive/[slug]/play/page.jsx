import InteractiveStoryPage from "../../../../components/interactive/InteractiveStoryPage";
import {
  getInteractiveProgressServer,
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
    robots: buildNoIndexRobots({ follow: true }),
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
