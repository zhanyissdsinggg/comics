export interface PaymentAttribution {
  promotionId?: string;
  offerId?: string;
  entryPoint?: string;
  campaignId?: string;
  sourcePath?: string;
  sourceSeriesId?: string;
  sourceEpisodeId?: string;
  returnTo?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
}

export function normalizePaymentAttribution(input: unknown): PaymentAttribution | null {
  if (!isRecord(input)) {
    return null;
  }

  const attribution: PaymentAttribution = {
    promotionId: normalizeString(input.promotionId, 120),
    offerId: normalizeString(input.offerId, 120),
    entryPoint: normalizeString(input.entryPoint, 80),
    campaignId: normalizeString(input.campaignId, 120),
    sourcePath: normalizeString(input.sourcePath, 512),
    sourceSeriesId: normalizeString(input.sourceSeriesId, 120),
    sourceEpisodeId: normalizeString(input.sourceEpisodeId, 120),
    returnTo: normalizeString(input.returnTo, 512),
  };

  return Object.values(attribution).some(Boolean) ? attribution : null;
}

export function readPaymentAttributionFromPayload(payload: string | null | undefined): PaymentAttribution | null {
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as { attribution?: unknown };
    return normalizePaymentAttribution(parsed?.attribution);
  } catch {
    return null;
  }
}
