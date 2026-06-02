import { cookies, headers } from "next/headers";
import { isServerAdultModeEnabled } from "./serverAdultGate";

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/$/, "");
}

async function getBaseUrl() {
  const configuredBaseUrl = normalizeBaseUrl(
    process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL,
  );
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const headerStore = await headers();
  const forwardedHost = normalizeBaseUrl(
    headerStore.get("x-forwarded-host") || headerStore.get("host") || "",
  );
  const forwardedProto = normalizeBaseUrl(
    headerStore.get("x-forwarded-proto") || "https",
  );
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return "http://127.0.0.1:4000";
}

function buildCookieHeader(cookieStore) {
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function apiGetServer(path) {
  try {
    const cookieStore = await cookies();
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        Cookie: buildCookieHeader(cookieStore),
      },
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

export async function getInteractiveServerAccess() {
  const includeAdult = await isServerAdultModeEnabled();
  return {
    includeAdult,
    contentMode: includeAdult ? "adult" : "normal",
  };
}

export async function getInteractiveStoriesServer() {
  const payload = await apiGetServer("/api/interactive-stories");
  return Array.isArray(payload?.stories) ? payload.stories : [];
}

function normalizeEnv(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveInteractiveDeploymentMode() {
  const vercelEnv = normalizeEnv(process.env.VERCEL_ENV);
  const deployEnv = normalizeEnv(process.env.NEXT_PUBLIC_DEPLOY_ENV);
  const nodeEnv = normalizeEnv(process.env.NODE_ENV);
  return vercelEnv || deployEnv || nodeEnv;
}

export async function getInteractiveNavigationAvailabilityServer() {
  const stories = await getInteractiveStoriesServer();
  if (stories.length > 0) {
    return {
      showInteractiveNav: true,
      hasPublishedStories: true,
    };
  }

  const deploymentEnv = resolveInteractiveDeploymentMode();
  const isProduction = deploymentEnv === "production";
  return {
    showInteractiveNav: !isProduction,
    hasPublishedStories: false,
  };
}

export async function getInteractiveStoryServer(slug) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) {
    return null;
  }
  const payload = await apiGetServer(
    `/api/interactive-stories/slug/${encodeURIComponent(normalizedSlug)}`,
  );
  return payload?.story || null;
}

export async function getInteractiveProgressServer(slug) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) {
    return null;
  }
  const payload = await apiGetServer(
    `/api/interactive-stories/slug/${encodeURIComponent(normalizedSlug)}/current`,
  );
  return payload?.progress || null;
}
