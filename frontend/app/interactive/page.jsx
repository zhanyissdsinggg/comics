import InteractiveStoriesHubPage from "../../components/interactive/InteractiveStoriesHubPage";
import { buildNoIndexRobots, createPageMetadata } from "../../lib/seo";
import { isServerAdultModeEnabled } from "../../lib/serverAdultGate";

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

export const metadata = createPageMetadata({
  title: "Interactive Stories",
  description: "Browse interactive stories on Gush.",
  path: "/interactive",
  robots: buildNoIndexRobots({ follow: true }),
});

export default async function InteractivePage() {
  const includeAdult = await isServerAdultModeEnabled();
  const adultFlag = includeAdult ? "1" : "0";
  let initialStories = [];

  try {
    const response = await fetch(
      `${getServerApiBaseUrl()}/api/interactive-stories?adult=${adultFlag}`,
      {
        cache: "no-store",
      },
    );
    if (response.ok) {
      const payload = await response.json();
      initialStories = Array.isArray(payload?.stories) ? payload.stories : [];
    }
  } catch {
    initialStories = [];
  }

  return <InteractiveStoriesHubPage initialStories={initialStories} />;
}
