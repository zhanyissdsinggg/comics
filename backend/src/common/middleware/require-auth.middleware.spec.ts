import type { NextFunction, Request, Response } from "express";
import { requireAuthMiddleware } from "./require-auth.middleware";

describe("requireAuthMiddleware", () => {
  function createResponse() {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    return response as unknown as Response;
  }

  it("allows payment webhooks without a logged-in user", () => {
    const req = {
      originalUrl: "/api/payments/webhook",
      path: "/api/payments/webhook",
      method: "POST",
    } as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    requireAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects protected payment routes without a user id", () => {
    const req = {
      originalUrl: "/api/payments/create",
      path: "/api/payments/create",
      method: "POST",
    } as Request;
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    requireAuthMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it("allows protected routes when the request already has a user id", () => {
    const req = {
      originalUrl: "/api/orders",
      path: "/api/orders",
      method: "GET",
      userId: "user-42",
    } as Request & { userId: string };
    const res = createResponse();
    const next = jest.fn() as NextFunction;

    requireAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
