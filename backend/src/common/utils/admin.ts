import { Request } from "express";

const ADMIN_KEY = process.env.ADMIN_KEY || "admin";

export function isAdminAuthorized(req: Request, body?: any) {
  const keyFromQuery = req.query?.key;
  const keyFromBody = body?.key;
  const headerKey = req.headers["x-admin-key"];
  const authHeader = req.headers.authorization;
  const bearer =
    typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7)
      : "";
  const key = (keyFromQuery || keyFromBody || headerKey || bearer || "").toString();
  return key === ADMIN_KEY;
}
