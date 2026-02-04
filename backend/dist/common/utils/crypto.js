"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptString = encryptString;
exports.decryptString = decryptString;
exports.isEncrypted = isEncrypted;
exports.hashToken = hashToken;
const crypto_1 = require("crypto");
const PREFIX = "enc_v1";
function getKey() {
    const secret = process.env.EMAIL_SECRET || "";
    if (!secret) {
        return null;
    }
    return (0, crypto_1.createHash)("sha256").update(secret).digest();
}
function encryptString(value) {
    if (!value) {
        return value;
    }
    const key = getKey();
    if (!key) {
        return value;
    }
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}
function decryptString(value) {
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
    const decipher = (0, crypto_1.createDecipheriv)("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
}
function isEncrypted(value) {
    return typeof value === "string" && value.startsWith(`${PREFIX}:`);
}
function hashToken(value) {
    return (0, crypto_1.createHash)("sha256").update(value).digest("hex");
}
