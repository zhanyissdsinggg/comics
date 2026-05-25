import { cookies } from "next/headers";
import { isServerAdultModeEnabled } from "./serverAdultGate";

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/$/, "");
}

function getBaseUrl() {
  return normalizeBaseUrl(
    process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://127.0.0.1:4000",
  );
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
    const response = await fetch(`${getBaseUrl()}${path}`, {
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
