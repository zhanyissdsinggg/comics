import { createHash, createHmac, timingSafeEqual } from "crypto";
import { getAdminTotpConfig, getAppConfig } from "../config/app-config";
import { AdminRole, normalizeAdminRole } from "../../modules/admin/permissions/admin-permissions";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_TOTP_DIGITS = 6;
const DEFAULT_TOTP_PERIOD_SECONDS = 30;
const DEFAULT_TOTP_WINDOW = 1;

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function decodeBase32(input: string): Buffer {
  const normalized = String(input || "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");

  let bits = 0;
  let bitLength = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      continue;
    }
    bits = (bits << 5) | index;
    bitLength += 5;
    if (bitLength >= 8) {
      bytes.push((bits >>> (bitLength - 8)) & 0xff);
      bitLength -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotpCode(secret: Buffer, counter: number, digits: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);

  const hmac = createHmac("sha1", secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const modulo = 10 ** digits;
  return String(binary % modulo).padStart(digits, "0");
}

function safeCodeEquals(left: string, right: string): boolean {
  const l = Buffer.from(String(left || ""));
  const r = Buffer.from(String(right || ""));
  if (l.length !== r.length) {
    return false;
  }
  return timingSafeEqual(l, r);
}

function buildAdminIdentity(adminKey: string, index: number): string {
  const digest = createHash("sha256").update(adminKey).digest("hex").slice(0, 12);
  return `admin-${index + 1}-${digest}`;
}

function getAdminKeyIndex(adminKey: string): number {
  const normalized = String(adminKey || "").trim();
  if (!normalized) {
    return -1;
  }

  return getAdminKeysFromEnv().findIndex((candidate) => candidate === normalized);
}

export function validateAdminKeyFormat(key: string): boolean {
  const normalized = String(key || "");
  if (normalized.length < 16) {
    return false;
  }
  const hasUpperCase = /[A-Z]/.test(normalized);
  const hasLowerCase = /[a-z]/.test(normalized);
  const hasNumber = /[0-9]/.test(normalized);
  const hasSpecial = /[^A-Za-z0-9]/.test(normalized);
  return hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
}

export function getAdminKeysFromEnv(): string[] {
  return [...new Set(getAppConfig().admin.keys.filter(Boolean))];
}

export function getAdminIdentityFromKey(adminKey: string): string | null {
  const index = getAdminKeyIndex(adminKey);
  if (index < 0) {
    return null;
  }

  return buildAdminIdentity(getAdminKeysFromEnv()[index], index);
}

export function getAdminRoleFromKey(adminKey: string): AdminRole {
  const index = getAdminKeyIndex(adminKey);
  if (index < 0) {
    return AdminRole.SUPER_ADMIN;
  }

  const configuredRole = getAppConfig().admin.roleAssignments[index + 1];
  return normalizeAdminRole(configuredRole, AdminRole.SUPER_ADMIN);
}

export function isAdminTotpEnabled(): boolean {
  return Boolean(getAdminTotpConfig().secret);
}

export function verifyAdminTotpCode(code: string): boolean {
  const normalizedCode = String(code || "").trim();
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const totpConfig = getAdminTotpConfig();
  if (!totpConfig.secret) {
    return true;
  }

  const decodedSecret = decodeBase32(totpConfig.secret);
  if (!decodedSecret.length) {
    return false;
  }

  const digits = toPositiveInt(totpConfig.digits, DEFAULT_TOTP_DIGITS);
  const periodSeconds = toPositiveInt(totpConfig.periodSeconds, DEFAULT_TOTP_PERIOD_SECONDS);
  const windowSize = toPositiveInt(totpConfig.window, DEFAULT_TOTP_WINDOW);
  const currentCounter = Math.floor(Date.now() / 1000 / periodSeconds);

  for (let offset = -windowSize; offset <= windowSize; offset += 1) {
    const expected = generateTotpCode(decodedSecret, currentCounter + offset, digits);
    if (safeCodeEquals(expected, normalizedCode)) {
      return true;
    }
  }

  return false;
}
