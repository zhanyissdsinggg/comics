import { BadRequestException } from "@nestjs/common";
import { AuthController } from "./auth.controller";

describe("AuthController", () => {
  const authServiceMock = {
    login: jest.fn(),
    refresh: jest.fn(),
    validateToken: jest.fn(),
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    idempotencyKey: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const emailServiceMock = {
    sendVerifyEmail: jest.fn(),
    sendResetEmail: jest.fn(),
    sendSmsOtp: jest.fn(),
    sendEmail: jest.fn(),
  };

  let controller: AuthController;
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
    jest.clearAllMocks();
    controller = new AuthController(
      authServiceMock as any,
      prismaMock as any,
      emailServiceMock as any,
    );
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      isBlocked: false,
    });
    prismaMock.idempotencyKey.upsert.mockResolvedValue({});
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("request-reset should not expose token by default", async () => {
    const response = await controller.requestReset("user@example.com");

    expect(response).toEqual(
      expect.objectContaining({
        success: true,
        ok: true,
      }),
    );
    expect(response).not.toHaveProperty("token");
    expect(emailServiceMock.sendResetEmail).toHaveBeenCalledTimes(1);
  });

  it("request-verify should not expose token by default", async () => {
    const response = await controller.requestVerify("user@example.com");

    expect(response).toEqual(
      expect.objectContaining({
        success: true,
        ok: true,
      }),
    );
    expect(response).not.toHaveProperty("token");
    expect(emailServiceMock.sendVerifyEmail).toHaveBeenCalledTimes(1);
  });

  it("request-reset should expose token only in explicit non-production debug mode", async () => {
    process.env.AUTH_DEBUG_TOKENS = "1";
    process.env.NODE_ENV = "development";

    const response = await controller.requestReset("user@example.com");

    expect(response).toEqual(
      expect.objectContaining({
        success: true,
        ok: true,
        token: expect.any(String),
      }),
    );
  });

  it("request-reset should keep token hidden in production even when debug flag exists", async () => {
    process.env.AUTH_DEBUG_TOKENS = "1";
    process.env.NODE_ENV = "production";

    const response = await controller.requestReset("user@example.com");

    expect(response).not.toHaveProperty("token");
  });

  it("request-reset should reject invalid email", async () => {
    await expect(controller.requestReset("invalid-email")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
