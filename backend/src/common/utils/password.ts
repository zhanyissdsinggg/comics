import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(raw: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(String(raw || ""), salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(raw: string, stored: string) {
  if (!stored) {
    return false;
  }
  if (!stored.startsWith("scrypt$")) {
    return stored === raw;
  }
  const parts = stored.split("$");
  if (parts.length !== 3) {
    return false;
  }
  const salt = parts[1];
  const expected = parts[2];
  const derived = scryptSync(String(raw || ""), salt, KEY_LENGTH);
  const expectedBuf = Buffer.from(expected, "hex");
  if (expectedBuf.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, derived);
}
