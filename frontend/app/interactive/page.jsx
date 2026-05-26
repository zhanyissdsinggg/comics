import InteractiveLandingPage from "../../components/interactive/InteractiveLandingPage";
import {
  getInteractiveServerAccess,
  getInteractiveStoriesServer,
} from "../../lib/interactiveServerApi";
import { createPageMetadata } from "../../lib/seo";
import { buildInteractiveLandingRobots } from "../../lib/interactiveSeo";

function normalizeEnv(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveInteractiveLaunchMode() {
  const vercelEnv = normalizeEnv(process.env.VERCEL_ENV);
  const deployEnv = normalizeEnv(process.env.NEXT_PUBLIC_DEPLOY_ENV);
  const nodeEnv = normalizeEnv(process.env.NODE_ENV);
  const deploymentEnv = vercelEnv || deployEnv || nodeEnv;
  const isProduction = deploymentEnv === "production";
  const showLaunchChecklist =
    vercelEnv === "preview" ||
    deployEnv === "staging" ||
    deployEnv === "preview" ||
    nodeEnv === "development";

  return {
    deploymentEnv,
    isProduction,
    showLaunchChecklist,
  };
}

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
  const { deploymentEnv, showLaunchChecklist } = resolveInteractiveLaunchMode();

  return (
    <InteractiveLandingPage
      initialStories={stories}
      initialContentMode={access.contentMode}
      showLaunchChecklist={showLaunchChecklist}
      deploymentEnv={deploymentEnv}
    />
  );
}
