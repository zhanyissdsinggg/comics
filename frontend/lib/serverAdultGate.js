import { cookies } from "next/headers";
import { requireLoginForAdult } from "./adultGateConfig";

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/$/, "");
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
  const hasSessionCookie = hasServerSessionCookie(cookieStore);
  if (!hasSessionCookie) {
    return { reason: requireLoginForAdult ? "NEED_LOGIN" : "NEED_AGE_CONFIRM" };
  }

  const [authPayload, preferencesPayload] = await Promise.all([
    fetchServerApiJson("/api/auth/me", cookieStore),
    fetchServerApiJson("/api/preferences", cookieStore),
  ]);

  const isSignedIn =
    authPayload?.isSignedIn === true || Boolean(authPayload?.user?.id);
  if (!isSignedIn) {
    return { reason: "NEED_LOGIN" };
  }

  const preferences = preferencesPayload?.preferences || {};
  const matureVerification = preferences.matureVerification || null;
  const verified = isVerifiedMatureStatus(matureVerification);

  if (!verified) {
    return { reason: "NEED_AGE_CONFIRM" };
  }

  if (requireLoginForAdult && !isSignedIn) {
    return { reason: "NEED_LOGIN" };
  }

  const matureModeEnabled = preferences.matureModeEnabled === true;

  if (!matureModeEnabled) {
    return { reason: "NEED_ADULT_MODE" };
  }

  return { reason: "OK" };
}

export async function isServerAdultModeEnabled() {
  const gate = await resolveServerAdultGate();
  return gate.reason === "OK";
}

export async function readServerAdultGateState() {
  const cookieStore = await cookies();
  const ageRuleKey =
    String(cookieStore.get("mn_age_rule")?.value || "global")
      .trim()
      .toLowerCase() || "global";
  const preferencesPayload = await fetchServerApiJson("/api/preferences", cookieStore);
  const preferences = preferencesPayload?.preferences || {};
  const verified = isVerifiedMatureStatus(preferences.matureVerification || null);
  const isAdultMode = verified && preferences.matureModeEnabled === true;

  if (verified) {
    return {
      adultConfirmed: verified,
      isAdultMode,
      ageRuleKey,
    };
  }

  return {
    adultConfirmed: false,
    isAdultMode: false,
    ageRuleKey,
  };
}
