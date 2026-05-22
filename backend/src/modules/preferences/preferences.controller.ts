import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { parseStoredJson, stringifyStoredJson } from "../../common/utils/stored-json";

type MatureVerificationPayload = {
  verified: boolean;
  provider: string;
  region: string;
  expiresAt: string | null;
  referenceId: string | null;
  verifiedAt: string | null;
};

type PreferencePayload = {
  notifyNewEpisode: boolean;
  notifyTtfReady: boolean;
  notifyPromo: boolean;
  region: string;
  language: string;
  hideAdultHistory: boolean;
  displayName: string;
  matureModeEnabled: boolean;
  matureVerification: MatureVerificationPayload;
};

const DEFAULT_MATURE_VERIFICATION: MatureVerificationPayload = {
  verified: false,
  provider: "local-gate",
  region: "global",
  expiresAt: null,
  referenceId: null,
  verifiedAt: null,
};

const DEFAULT_PREFERENCES: PreferencePayload = {
  notifyNewEpisode: true,
  notifyTtfReady: true,
  notifyPromo: true,
  region: "global",
  language: "en",
  hideAdultHistory: false,
  displayName: "",
  matureModeEnabled: false,
  matureVerification: DEFAULT_MATURE_VERIFICATION,
};

const SERVICE_MANAGED_MATURE_PROVIDER = "local-gate";

function isPreferenceRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function normalizeMatureVerification(
  value: unknown,
  fallbackRegion = DEFAULT_PREFERENCES.region,
): MatureVerificationPayload {
  const parsed = isPreferenceRecord(value) ? value : {};

  return {
    verified:
      typeof parsed.verified === "boolean"
        ? parsed.verified
        : DEFAULT_MATURE_VERIFICATION.verified,
    provider:
      typeof parsed.provider === "string" && parsed.provider.trim()
        ? parsed.provider.trim()
        : DEFAULT_MATURE_VERIFICATION.provider,
    region:
      typeof parsed.region === "string" && parsed.region.trim()
        ? parsed.region.trim()
        : fallbackRegion || DEFAULT_MATURE_VERIFICATION.region,
    expiresAt: normalizeOptionalString(parsed.expiresAt),
    referenceId: normalizeOptionalString(parsed.referenceId),
    verifiedAt: normalizeOptionalString(parsed.verifiedAt),
  };
}

function normalizePreferencePayload(value: unknown): PreferencePayload {
  const parsed =
    typeof value === "string"
      ? parseStoredJson<Record<string, unknown>>(value, {})
      : isPreferenceRecord(value)
        ? value
        : {};

  return {
    notifyNewEpisode:
      typeof parsed.notifyNewEpisode === "boolean"
        ? parsed.notifyNewEpisode
        : DEFAULT_PREFERENCES.notifyNewEpisode,
    notifyTtfReady:
      typeof parsed.notifyTtfReady === "boolean"
        ? parsed.notifyTtfReady
        : DEFAULT_PREFERENCES.notifyTtfReady,
    notifyPromo:
      typeof parsed.notifyPromo === "boolean"
        ? parsed.notifyPromo
        : DEFAULT_PREFERENCES.notifyPromo,
    region:
      typeof parsed.region === "string" && parsed.region.trim()
        ? parsed.region
        : DEFAULT_PREFERENCES.region,
    language:
      typeof parsed.language === "string" && parsed.language.trim()
        ? parsed.language
        : DEFAULT_PREFERENCES.language,
    hideAdultHistory:
      typeof parsed.hideAdultHistory === "boolean"
        ? parsed.hideAdultHistory
        : DEFAULT_PREFERENCES.hideAdultHistory,
    displayName:
      typeof parsed.displayName === "string"
        ? parsed.displayName
        : DEFAULT_PREFERENCES.displayName,
    matureModeEnabled:
      typeof parsed.matureModeEnabled === "boolean"
        ? parsed.matureModeEnabled
        : typeof parsed.adultModeEnabled === "boolean"
          ? parsed.adultModeEnabled
          : DEFAULT_PREFERENCES.matureModeEnabled,
    matureVerification: normalizeMatureVerification(
      parsed.matureVerification,
      typeof parsed.region === "string" && parsed.region.trim()
        ? parsed.region
        : DEFAULT_PREFERENCES.region,
    ),
  };
}

function buildServerManagedMatureVerification(
  region: string,
  current?: MatureVerificationPayload | null,
): MatureVerificationPayload {
  const normalizedRegion = String(region || "").trim() || DEFAULT_PREFERENCES.region;
  const fallback = current || DEFAULT_MATURE_VERIFICATION;

  return {
    verified: fallback.verified === true,
    provider:
      typeof fallback.provider === "string" && fallback.provider.trim()
        ? fallback.provider.trim()
        : SERVICE_MANAGED_MATURE_PROVIDER,
    region:
      typeof fallback.region === "string" && fallback.region.trim()
        ? fallback.region.trim()
        : normalizedRegion,
    expiresAt: normalizeOptionalString(fallback.expiresAt),
    referenceId: normalizeOptionalString(fallback.referenceId),
    verifiedAt: normalizeOptionalString(fallback.verifiedAt),
  };
}

function mergeUserEditablePreferences(
  currentPreferences: PreferencePayload,
  incomingPreferences: PreferencePayload,
): PreferencePayload {
  return {
    ...currentPreferences,
    ...incomingPreferences,
    matureVerification: buildServerManagedMatureVerification(
      incomingPreferences.region || currentPreferences.region,
      currentPreferences.matureVerification,
    ),
  };
}

@Controller("preferences")
export class PreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getPreferences(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      return {
        preferences: DEFAULT_PREFERENCES,
      };
    }

    const existing = await this.prisma.userPreference.findUnique({ where: { userId } });
    return {
      preferences: normalizePreferencePayload(existing?.payload || existing?.settings),
    };
  }

  @Post()
  async save(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const existing = await this.prisma.userPreference.findUnique({ where: { userId } });
    const currentPreferences = normalizePreferencePayload(
      existing?.payload || existing?.settings,
    );
    const incomingPreferences = normalizePreferencePayload(body?.preferences);
    const payload = mergeUserEditablePreferences(
      currentPreferences,
      incomingPreferences,
    );
    const serializedPayload = stringifyStoredJson(payload);
    const saved = await this.prisma.userPreference.upsert({
      where: { userId },
      update: { payload: serializedPayload },
      create: { userId, payload: serializedPayload },
    });

    return {
      preferences: normalizePreferencePayload(saved.payload),
    };
  }

  @Post("mature/confirm")
  async confirmMatureAccess(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }

    const existing = await this.prisma.userPreference.findUnique({ where: { userId } });
    const currentPreferences = normalizePreferencePayload(
      existing?.payload || existing?.settings,
    );
    const requestedRegion = String(body?.region || currentPreferences.region || "")
      .trim()
      .toLowerCase();
    const region = requestedRegion || DEFAULT_PREFERENCES.region;
    const verifiedAt = new Date().toISOString();
    const matureVerification: MatureVerificationPayload = {
      verified: true,
      provider: SERVICE_MANAGED_MATURE_PROVIDER,
      region,
      expiresAt: null,
      referenceId: null,
      verifiedAt,
    };
    const payload: PreferencePayload = {
      ...currentPreferences,
      region,
      matureModeEnabled:
        typeof body?.matureModeEnabled === "boolean"
          ? body.matureModeEnabled === true
          : true,
      matureVerification,
    };
    const serializedPayload = stringifyStoredJson(payload);
    const saved = await this.prisma.userPreference.upsert({
      where: { userId },
      update: { payload: serializedPayload },
      create: { userId, payload: serializedPayload },
    });

    return {
      preferences: normalizePreferencePayload(saved.payload),
    };
  }
}
