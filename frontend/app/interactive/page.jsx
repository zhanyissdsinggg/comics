import InteractiveLandingPage from "../../components/interactive/InteractiveLandingPage";
import {
  getInteractiveServerAccess,
  getInteractiveStoriesServer,
} from "../../lib/interactiveServerApi";
import { createPageMetadata } from "../../lib/seo";
import { buildInteractiveLandingRobots } from "../../lib/interactiveSeo";

export const metadata = createPageMetadata({
  title: "Interactive Stories",
  description: "Choose the route. Push the story somewhere nobody else took it.",
  path: "/interactive",
  robots: buildInteractiveLandingRobots(),
});

export default async function InteractiveLandingRoute() {
  const [access, stories] = await Promise.all([
    getInteractiveServerAccess(),
    getInteractiveStoriesServer(),
  ]);
  const deploymentEnv = String(
    process.env.VERCEL_ENV ||
      process.env.NEXT_PUBLIC_DEPLOY_ENV ||
      process.env.NODE_ENV ||
      "",
  )
    .trim()
    .toLowerCase();
  const showLaunchChecklist = deploymentEnv !== "production";

  return (
    <InteractiveLandingPage
      initialStories={stories}
      initialContentMode={access.contentMode}
      showLaunchChecklist={showLaunchChecklist}
    />
  );
}
