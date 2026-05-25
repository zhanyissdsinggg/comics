import { Request } from "express";
import { getAppConfig } from "../config/app-config";
import { logger } from "../logger/winston.init";
import { getAdminKeysFromEnv, validateAdminKeyFormat } from "./admin-security";

let validatedAdminKeys: string[] | null = null;
let validationLogged = false;

function resolveValidatedAdminKeys(): string[] {
  if (validatedAdminKeys) {
    return validatedAdminKeys;
  }

  const adminKeys = getAdminKeysFromEnv();
  const adminConfig = getAppConfig().admin;

  if (!adminKeys.length && !adminConfig.passwordAuthEnabled) {
    logger.error("Fatal: ADMIN_KEY or ADMIN_KEYS is not configured.");
    logger.error("Set at least one admin key. Example: ADMIN_KEYS=key1,key2");
    process.exit(1);
  }

  const invalidKeys = adminKeys.filter((key) => !validateAdminKeyFormat(key));
  if (invalidKeys.length) {
    logger.error("Fatal: one or more admin keys do not meet security requirements.");
    logger.error("Each key must be >=16 chars and include upper/lower case letters, digits, and symbols.");
    process.exit(1);
  }

  if (adminKeys.length && !validationLogged) {
    logger.info(`Admin key validation passed. Loaded ${adminKeys.length} admin key(s).`);
    validationLogged = true;
  }

  validatedAdminKeys = adminKeys;
  return validatedAdminKeys;
}

export function isAdminAuthorized(req: Request, _body?: any) {
  const adminKeys = resolveValidatedAdminKeys();
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

  return adminKeys.includes(bearer);
}
