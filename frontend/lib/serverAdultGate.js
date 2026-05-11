import { cookies } from "next/headers";
import { canReadMatureFromCookieStore } from "./matureContent";

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function getServerApiBaseUrl() {
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

export function hasServerSessionCookie(cookieStore) {
  return Boolean(String(cookieStore.get("mn_session")?.value || "").trim());
}

async function fetchServerApiJson(path, cookieStore) {
  const cookieHeader = buildCookieHeader(cookieStore);
  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(`${getServerApiBaseUrl()}${path}`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader,
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

function isVerifiedMatureStatus(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const expiresAt =
    typeof value.expiresAt === "string" && value.expiresAt.trim()
      ? Date.parse(value.expiresAt)
      : NaN;

  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
    return false;
  }

  return value.verified === true;
}

export async function resolveServerAdultGate() {
  const cookieStore = await cookies();

  const statusCookie = String(
    cookieStore.get("mn_mature_status")?.value || "",
  ).trim();
  if (statusCookie) {
    try {
      const parsed = JSON.parse(statusCookie);
      const verified = isVerifiedMatureStatus(parsed);
      const matureModeEnabled = parsed?.matureModeEnabled === true;
      const isSignedIn =
        String(cookieStore.get("mn_is_signed_in")?.value || "").trim() === "1" ||
        hasServerSessionCookie(cookieStore);

      if (!isSignedIn) {
        return { reason: "NEED_LOGIN" };
      }
      if (!verified) {
        return { reason: "NEED_AGE_CONFIRM" };
      }
      if (!matureModeEnabled) {
        return { reason: "NEED_ADULT_MODE" };
      }

      return { reason: "OK" };
    } catch {
      // Fall through to server-side session + preferences resolution.
    }
  }

  const [authPayload, preferencesPayload] = await Promise.all([
    fetchServerApiJson("/api/auth/me", cookieStore),
    fetchServerApiJson("/api/preferences", cookieStore),
  ]);

  const isSignedIn =
    authPayload?.isSignedIn === true ||
    Boolean(authPayload?.user?.id) ||
    String(cookieStore.get("mn_is_signed_in")?.value || "").trim() === "1" ||
    hasServerSessionCookie(cookieStore);

  if (!isSignedIn) {
    return { reason: "NEED_LOGIN" };
  }

  const preferences = preferencesPayload?.preferences || {};
  const matureVerification = preferences.matureVerification || null;
  const verified =
    isVerifiedMatureStatus(matureVerification) ||
    String(cookieStore.get("mn_adult_confirmed")?.value || "").trim() === "1";

  if (!verified) {
    return { reason: "NEED_AGE_CONFIRM" };
  }

  const matureModeEnabled =
    preferences.matureModeEnabled === true ||
    String(cookieStore.get("mn_adult_mode")?.value || "").trim() === "1";

  if (!matureModeEnabled) {
    return { reason: "NEED_ADULT_MODE" };
  }

  return { reason: "OK" };
}

export async function isServerAdultModeEnabled() {
  const cookieStore = await cookies();
  return canReadMatureFromCookieStore(cookieStore);
}

export async function readServerAdultGateState() {
  const cookieStore = await cookies();
  const statusCookie = String(
    cookieStore.get("mn_mature_status")?.value || "",
  ).trim();
  const ageRuleKey = String(cookieStore.get("mn_age_rule")?.value || "global")
    .trim()
    .toLowerCase() || "global";

  if (statusCookie) {
    try {
      const parsed = JSON.parse(statusCookie);
      const adultConfirmed = isVerifiedMatureStatus(parsed);
      const isAdultMode =
        adultConfirmed && parsed?.matureModeEnabled === true;
      return {
        adultConfirmed,
        isAdultMode,
        ageRuleKey,
      };
    } catch {
      // Fall through to legacy cookies.
    }
  }

  return {
    adultConfirmed:
      String(cookieStore.get("mn_adult_confirmed")?.value || "").trim() === "1",
    isAdultMode: canReadMatureFromCookieStore(cookieStore),
    ageRuleKey,
  };
}
