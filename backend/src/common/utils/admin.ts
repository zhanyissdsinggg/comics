import { Request } from "express";
import { logger } from "../logger/winston.init";
import { getAdminKeysFromEnv, validateAdminKeyFormat } from "./admin-security";

const ADMIN_KEYS = getAdminKeysFromEnv();

if (!ADMIN_KEYS.length) {
  logger.error("Fatal: ADMIN_KEY or ADMIN_KEYS is not configured.");
  logger.error("Set at least one admin key. Example: ADMIN_KEYS=key1,key2");
  process.exit(1);
}

const invalidKeys = ADMIN_KEYS.filter((key) => !validateAdminKeyFormat(key));
if (invalidKeys.length) {
  logger.error("Fatal: one or more admin keys do not meet security requirements.");
  logger.error("Each key must be >=16 chars and include upper/lower case letters, digits, and symbols.");
  process.exit(1);
}

logger.info(`Admin key validation passed. Loaded ${ADMIN_KEYS.length} admin key(s).`);

export function isAdminAuthorized(req: Request, _body?: any) {
  const user = (req as any).user;
  if (user && user.role === "admin") {
    return true;
  }

  const authHeader = req.headers.authorization;
  const bearer =
    typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

  if (!bearer) {
    return false;
  }

  return ADMIN_KEYS.includes(bearer);
}
