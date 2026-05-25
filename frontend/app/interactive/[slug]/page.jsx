import InteractiveStoryDetailPage from "../../../components/interactive/InteractiveStoryDetailPage";
import { buildNoIndexRobots, createPageMetadata } from "../../../lib/seo";
import { isServerAdultModeEnabled } from "../../../lib/serverAdultGate";

function getServerApiBaseUrl() {
  return String(
    process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://127.0.0.1:4000",
  )
    .trim()
    .replace(/\/$/, "");
}

async function loadStory(slug, includeAdult) {
  try {
    const response = await fetch(
      `${getServerApiBaseUrl()}/api/interactive-stories/slug/${encodeURIComponent(slug)}?adult=${includeAdult ? "1" : "0"}`,
      {
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    return payload?.story || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const slug = String(resolvedParams?.slug || "").trim();
  const includeAdult = await isServerAdultModeEnabled();
  const story = await loadStory(slug, includeAdult);

  return createPageMetadata({
    title: story?.title || "Interactive Story",
    description:
      story?.description ||
      "Branching interactive fiction with multiple endings on Gush.",
    path: `/interactive/${slug}`,
    image: story?.coverImage || null,
    robots: buildNoIndexRobots({ follow: true }),
  });
}

export default async function InteractiveStoryDetailRoute({ params }) {
  const resolvedParams = await Promise.resolve(params);
  const slug = String(resolvedParams?.slug || "").trim();
  const includeAdult = await isServerAdultModeEnabled();
  const story = await loadStory(slug, includeAdult);

  return <InteractiveStoryDetailPage slug={slug} initialStory={story} />;
}
