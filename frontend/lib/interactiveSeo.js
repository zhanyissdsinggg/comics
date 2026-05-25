import { buildIndexRobots, buildNoIndexRobots } from "./seo";

function normalizeEnv(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildInteractiveLandingRobots() {
  const deploymentEnv =
    normalizeEnv(process.env.VERCEL_ENV) ||
    normalizeEnv(process.env.NEXT_PUBLIC_DEPLOY_ENV) ||
    normalizeEnv(process.env.NODE_ENV);

  const allowIndex =
    deploymentEnv === "production" &&
    normalizeEnv(process.env.NEXT_PUBLIC_INTERACTIVE_ALLOW_INDEX || "1") !== "0";

  return allowIndex
    ? buildIndexRobots({ follow: true })
    : buildNoIndexRobots({ follow: true });
}
