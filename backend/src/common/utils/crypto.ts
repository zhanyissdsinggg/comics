import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "enc_v1";

function getKey() {
  const secret = process.env.EMAIL_SECRET || "";
  if (!secret) {
    return null;
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptString(value: string) {
  if (!value) {
    return value;
  }
  const key = getKey();
  if (!key) {
    return value;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptString(value: string) {
  if (!value) {
    return value;
  }
  if (!value.startsWith(`${PREFIX}:`)) {
    return value;
  }
  const key = getKey();
  if (!key) {
    return "";
  }
  const parts = value.split(":");
  if (parts.length !== 4) {
    return "";
  }
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const encrypted = Buffer.from(parts[3], "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

export function isEncrypted(value: string) {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`);
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
