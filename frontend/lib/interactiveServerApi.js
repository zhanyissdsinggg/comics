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
  const response = await apiGetServerResponse(path);
  return response.ok ? response.data : null;
}

export async function apiGetServerResponse(path) {
  try {
    const cookieStore = await cookies();
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        Cookie: buildCookieHeader(cookieStore),
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return {
          ok: false,
          status: response.status,
          ...payload,
        };
      }
      return {
        ok: false,
        status: response.status,
        error: response.statusText || "REQUEST_FAILED",
      };
    }
    return {
      ok: true,
      status: response.status,
      data: payload,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "NETWORK_ERROR",
    };
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
  const state = await getInteractiveStoryServerState(slug);
  return state.story;
}

export async function getInteractiveStoryServerState(slug) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) {
    return { story: null, accessState: null };
  }

  const response = await apiGetServerResponse(
    `/api/interactive-stories/slug/${encodeURIComponent(normalizedSlug)}`,
  );

  if (response.ok) {
    return {
      story: response.data?.story || null,
      accessState: null,
    };
  }

  if (response.status === 402) {
    return {
      story: null,
      accessState: {
        status: response.status,
        reason: response.reason || "",
        error: response.error || "",
        message: response.message || "",
      },
    };
  }

  return {
    story: null,
    accessState: null,
  };
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

export async function getInteractiveProgressServerState(slug) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) {
    return { progress: null, accessState: null };
  }

  const response = await apiGetServerResponse(
    `/api/interactive-stories/slug/${encodeURIComponent(normalizedSlug)}/current`,
  );

  if (response.ok) {
    return {
      progress: response.data?.progress || null,
      accessState: null,
    };
  }

  if (response.status === 402) {
    return {
      progress: null,
      accessState: {
        status: response.status,
        reason: response.reason || "",
        error: response.error || "",
        message: response.message || "",
      },
    };
  }

  return {
    progress: null,
    accessState: null,
  };
}
