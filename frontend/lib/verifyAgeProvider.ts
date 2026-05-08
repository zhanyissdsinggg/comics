"use client";

export type VerifyAgeProviderId =
  | "local-gate"
  | "persona"
  | "yoti"
  | "agego"
  | "stripe-identity"
  | "custom";

export type MatureVerificationStatus = {
  verified: boolean;
  provider: VerifyAgeProviderId;
  region: string;
  expiresAt: string | null;
  referenceId: string | null;
  verifiedAt: string | null;
};

export type VerifyAgeProviderResult = MatureVerificationStatus;

export interface VerifyAgeProviderAdapter {
  id: VerifyAgeProviderId;
  verify(input: {
    region: string;
    legalAge: number;
  }): Promise<VerifyAgeProviderResult>;
}

export const DEFAULT_MATURE_VERIFICATION_STATUS: MatureVerificationStatus = {
  verified: false,
  provider: "local-gate",
  region: "global",
  expiresAt: null,
  referenceId: null,
  verifiedAt: null,
};

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

export function normalizeMatureVerificationStatus(
  value: unknown,
  fallbackRegion = "global",
): MatureVerificationStatus {
  const raw = value && typeof value === "object" ? value : {};
  const verified = Boolean((raw as { verified?: unknown }).verified);
  const provider = normalizeString(
    (raw as { provider?: unknown }).provider,
    DEFAULT_MATURE_VERIFICATION_STATUS.provider,
  ) as VerifyAgeProviderId;
  const region = normalizeString(
    (raw as { region?: unknown }).region,
    fallbackRegion || DEFAULT_MATURE_VERIFICATION_STATUS.region,
  );
  const expiresAt = normalizeString(
    (raw as { expiresAt?: unknown }).expiresAt,
    "",
  );
  const referenceId = normalizeString(
    (raw as { referenceId?: unknown }).referenceId,
    "",
  );
  const verifiedAt = normalizeString(
    (raw as { verifiedAt?: unknown }).verifiedAt,
    "",
  );

  return {
    verified,
    provider:
      provider || DEFAULT_MATURE_VERIFICATION_STATUS.provider,
    region,
    expiresAt: expiresAt || null,
    referenceId: referenceId || null,
    verifiedAt: verifiedAt || null,
  };
}

export function isMatureVerificationActive(
  verification: MatureVerificationStatus | null | undefined,
  region = "global",
): boolean {
  if (!verification?.verified) {
    return false;
  }

  if (verification.expiresAt) {
    const expiry = Date.parse(verification.expiresAt);
    if (Number.isFinite(expiry) && expiry <= Date.now()) {
      return false;
    }
  }

  if (region && verification.region && verification.region !== region) {
    return false;
  }

  return true;
}

export function createLocalGateAgeProvider(): VerifyAgeProviderAdapter {
  return {
    id: "local-gate",
    async verify({ region }) {
      const now = new Date().toISOString();
      return {
        verified: true,
        provider: "local-gate",
        region: normalizeString(region, "global"),
        expiresAt: null,
        referenceId: null,
        verifiedAt: now,
      };
    },
  };
}

export const localGateAgeProvider = createLocalGateAgeProvider();
