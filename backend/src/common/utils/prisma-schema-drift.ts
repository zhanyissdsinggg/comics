import { Prisma } from "@prisma/client";

const DEFAULT_PATTERNS = [
  "does not exist",
  "Unknown column",
  "no such column",
  "Undefined column",
  "Undefined table",
];

const RAW_SCHEMA_DRIFT_CODES = new Set(["42703", "42P01", "1054"]);

function readErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }
  return String((error as { code?: string }).code || "");
}

function readErrorMeta(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return {};
  }
  const meta = (error as { meta?: unknown }).meta;
  return meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
}

export function isPrismaSchemaDriftError(error: unknown, extraPatterns: string[] = []): boolean {
  const patterns = [...DEFAULT_PATTERNS, ...extraPatterns];
  const code = readErrorCode(error);

  if (error instanceof Prisma.PrismaClientKnownRequestError || code) {
    if (code === "P2021" || code === "P2022") {
      return true;
    }
    if (code === "P2010") {
      const meta = readErrorMeta(error);
      const rawCode = String(meta.code || "");
      const rawMessage = String(meta.message || "");
      if (RAW_SCHEMA_DRIFT_CODES.has(rawCode)) {
        return true;
      }
      if (patterns.some((pattern) => rawMessage.includes(pattern))) {
        return true;
      }
    }
  }

  const message = String((error as { message?: string } | null)?.message || "");
  return patterns.some((pattern) => message.includes(pattern));
}
