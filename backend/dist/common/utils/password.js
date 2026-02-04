"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const crypto_1 = require("crypto");
const KEY_LENGTH = 64;
function hashPassword(raw) {
    const salt = (0, crypto_1.randomBytes)(16).toString("hex");
    const derived = (0, crypto_1.scryptSync)(String(raw || ""), salt, KEY_LENGTH).toString("hex");
    return `scrypt$${salt}$${derived}`;
}
function verifyPassword(raw, stored) {
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
    const derived = (0, crypto_1.scryptSync)(String(raw || ""), salt, KEY_LENGTH);
    const expectedBuf = Buffer.from(expected, "hex");
    if (expectedBuf.length !== derived.length) {
        return false;
    }
    return (0, crypto_1.timingSafeEqual)(expectedBuf, derived);
}
