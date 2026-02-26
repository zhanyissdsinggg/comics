import { Request } from "express";

export function getUserIdFromRequest(req: Request, allowGuest = true) {
  const direct = (req as Request & { userId?: string }).userId;
  if (direct) {
    return direct;
  }
  if (allowGuest) {
    return "guest";
  }
  return null;
}
