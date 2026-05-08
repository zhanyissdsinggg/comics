import { PrismaService } from "../prisma/prisma.service";
import { parseStoredJson } from "./stored-json";

export function parseBool(value: string | undefined) {
  if (value === undefined || value === null) {
    return null;
  }
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return null;
}

type AdultGateContext = {
  ok: boolean;
  reason: "OK" | "NEED_LOGIN" | "NEED_AGE_CONFIRM" | "NEED_ADULT_MODE";
  matureModeEnabled: boolean;
  verified: boolean;
  region: string;
};

export function checkAdultGate(cookies: Record<string, string>) {
  const requireLoginForAdult = true;
  const isSignedIn = cookies.mn_is_signed_in === "1";
  const adultConfirmed = cookies.mn_adult_confirmed === "1";
  const isAdultMode = cookies.mn_adult_mode === "1";
  if (requireLoginForAdult && !isSignedIn) {
    return { ok: false, reason: "NEED_LOGIN" };
  }
  if (!adultConfirmed) {
    return { ok: false, reason: "NEED_AGE_CONFIRM" };
  }
  if (!isAdultMode) {
    return { ok: false, reason: "NEED_ADULT_MODE" };
  }
  return { ok: true, reason: "OK" };
}

function normalizeStoredMatureVerification(
  payload: Record<string, unknown>,
  fallbackRegion = "global",
) {
  const verification =
    payload && typeof payload.matureVerification === "object"
      ? (payload.matureVerification as Record<string, unknown>)
      : {};

  return {
    verified: verification.verified === true,
    region:
      typeof verification.region === "string" && verification.region.trim()
        ? verification.region.trim()
        : fallbackRegion,
    expiresAt:
      typeof verification.expiresAt === "string" && verification.expiresAt.trim()
        ? verification.expiresAt.trim()
        : null,
  };
}

function isVerificationExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  const parsed = Date.parse(expiresAt);
  return Number.isFinite(parsed) && parsed <= Date.now();
}

export async function resolveAdultGateContext(
  prisma: PrismaService,
  req: {
    userId?: string;
    cookies?: Record<string, string>;
  },
): Promise<AdultGateContext> {
  const requireLoginForAdult = true;
  const userId = String(req?.userId || "").trim();
  const cookies = req?.cookies || {};

  if (requireLoginForAdult && !userId) {
    return {
      ok: false,
      reason: "NEED_LOGIN",
      matureModeEnabled: false,
      verified: false,
      region: "global",
    };
  }

  const preference = userId
    ? await prisma.userPreference.findUnique({
        where: { userId },
        select: { payload: true, settings: true },
      })
    : null;
  const payload = parseStoredJson<Record<string, unknown>>(
    preference?.payload || preference?.settings || "",
    {},
  );
  const region =
    typeof payload.region === "string" && payload.region.trim()
      ? payload.region.trim()
      : String(cookies.mn_age_rule || cookies.mn_region || "global").trim() || "global";
  const verification = normalizeStoredMatureVerification(payload, region);
  const matureModeEnabled =
    payload.matureModeEnabled === true ||
    payload.adultModeEnabled === true ||
    cookies.mn_adult_mode === "1";
  const verified =
    verification.verified &&
    !isVerificationExpired(verification.expiresAt) &&
    verification.region === region;

  if (!verified) {
    return {
      ok: false,
      reason: "NEED_AGE_CONFIRM",
      matureModeEnabled,
      verified: false,
      region,
    };
  }

  if (!matureModeEnabled) {
    return {
      ok: false,
      reason: "NEED_ADULT_MODE",
      matureModeEnabled: false,
      verified: true,
      region,
    };
  }

  return {
    ok: true,
    reason: "OK",
    matureModeEnabled: true,
    verified: true,
    region,
  };
}
