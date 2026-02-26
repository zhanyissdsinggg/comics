import { Request } from "express";

export function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === "string"
      ? forwarded.split(",")[0]
      : "";
  const ip = raw || req.socket?.remoteAddress || "";
  return String(ip).replace("::ffff:", "").trim();
}
