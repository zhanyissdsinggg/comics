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

function hasSignedInHintCookie(cookieStore) {
  return String(cookieStore.get("mn_is_signed_in")?.value || "").trim() === "1";
}

function isProductionRuntime() {
  return String(process.env.NODE_ENV || "").trim().toLowerCase() === "production";
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

function parseCookieJson(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

function readCookieMatureState(cookieStore) {
  const parsedStatus = parseCookieJson(
    cookieStore.get("mn_mature_status")?.value || "",
  );
  const confirmed =
    String(cookieStore.get("mn_adult_confirmed")?.value || "").trim() === "1";
  const modeEnabled =
    String(cookieStore.get("mn_adult_mode")?.value || "").trim() === "1";
  const verifiedFromStatus = isVerifiedMatureStatus(parsedStatus);

  return {
    verified: verifiedFromStatus || confirmed,
    matureModeEnabled:
      parsedStatus?.matureModeEnabled === true || modeEnabled,
  };
}

export async function resolveServerAdultGate() {
  const cookieStore = await cookies();
  const hasSessionCookie = hasServerSessionCookie(cookieStore);

  const [authPayload, preferencesPayload] = await Promise.all([
    fetchServerApiJson("/api/auth/me", cookieStore),
    fetchServerApiJson("/api/preferences", cookieStore),
  ]);

  const isSignedIn =
    authPayload?.isSignedIn === true ||
    Boolean(authPayload?.user?.id) ||
    hasSessionCookie;

  const preferences = preferencesPayload?.preferences || {};
  const matureVerification = preferences.matureVerification || null;
  const cookieMatureState = readCookieMatureState(cookieStore);
  const verifiedViaServer = isVerifiedMatureStatus(matureVerification);
  const canUseVerifiedCookieFallback =
    !verifiedViaServer && hasSessionCookie && cookieMatureState.verified;
  const verified = verifiedViaServer || canUseVerifiedCookieFallback;

  if (!verified) {
    if (!isProductionRuntime()) {
      if (cookieMatureState.verified) {
        if (cookieMatureState.matureModeEnabled) {
          return { reason: "OK" };
        }
        return { reason: "NEED_ADULT_MODE" };
      }
    }
    return { reason: "NEED_AGE_CONFIRM" };
  }

  if (requireLoginForAdult && !isSignedIn && !hasSignedInHintCookie(cookieStore)) {
    return { reason: "NEED_LOGIN" };
  }

  const matureModeEnabled =
    preferences.matureModeEnabled === true ||
    (!verifiedViaServer && cookieMatureState.matureModeEnabled === true);

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

  if (verified || isProductionRuntime()) {
    return {
      adultConfirmed: verified,
      isAdultMode,
      ageRuleKey,
    };
  }

  return {
    adultConfirmed:
      String(cookieStore.get("mn_adult_confirmed")?.value || "").trim() === "1",
    isAdultMode:
      String(cookieStore.get("mn_adult_mode")?.value || "").trim() === "1",
    ageRuleKey,
  };
}
