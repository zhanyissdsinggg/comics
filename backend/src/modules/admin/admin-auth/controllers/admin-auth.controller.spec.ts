import { Test, TestingModule } from "@nestjs/testing";
import { HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import {
  getAdminKeysFromEnv,
  isAdminTotpEnabled,
  verifyAdminTotpCode,
} from "../../../../common/utils/admin-security";
import { getRedisClient } from "../../../../common/redis/client";
import { resetAdminTokenRevocationStore } from "../../utils/admin-token-revocation";

const mockRedis = {
  get: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  setex: jest.fn(),
};

jest.mock("../../../../common/redis/client", () => ({
  getRedisClient: jest.fn(() => mockRedis),
}));

jest.mock("../../../../common/utils/admin-security", () => ({
  getAdminKeysFromEnv: jest.fn(),
  validateAdminKeyFormat: jest.fn(() => true),
  isAdminTotpEnabled: jest.fn(),
  verifyAdminTotpCode: jest.fn(),
}));

describe("AdminAuthController", () => {
  let controller: AdminAuthController;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let adminLogService: { log: jest.Mock };
  const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload: { type?: string }) =>
              payload?.type === "refresh" ? "mock-refresh-token" : "mock-access-token"
            ),
            verify: jest.fn((token: string) => {
              if (token === "valid-refresh-token" || token === "mock-refresh-token") {
                return { role: "admin", type: "refresh", jti: "refresh-jti" };
              }
              return { role: "admin", jti: "access-jti" };
            }),
          },
        },
        {
          provide: AdminLogService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
    jwtService = module.get(JwtService);
    adminLogService = module.get(AdminLogService);

    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.setex.mockResolvedValue("OK");
    mockGetRedisClient.mockReturnValue(mockRedis as any);

    (getAdminKeysFromEnv as jest.Mock).mockReturnValue(["test-admin-key"]);
    (isAdminTotpEnabled as jest.Mock).mockReturnValue(false);
    (verifyAdminTotpCode as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetAdminTokenRevocationStore();
  });

  describe("login", () => {
    it("should login successfully with valid admin key", async () => {
      const req = {
        ip: "127.0.0.1",
        headers: {},
        cookies: {},
        res: { setHeader: jest.fn() },
      };

      const result = await controller.login({ adminKey: "test-admin-key" }, req);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresIn: 86400,
        }),
      );
      expect(adminLogService.log).toHaveBeenCalledWith(
        "login_success",
        "auth",
        "admin",
        expect.any(Object),
      );
    });

    it("should reject invalid admin key", async () => {
      const req = {
        ip: "127.0.0.1",
        headers: {},
        cookies: {},
        res: { setHeader: jest.fn() },
      };

      await expect(controller.login({ adminKey: "wrong-key" }, req)).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it("should enforce TOTP when enabled", async () => {
      (isAdminTotpEnabled as jest.Mock).mockReturnValue(true);
      (verifyAdminTotpCode as jest.Mock).mockReturnValue(false);

      const req = {
        ip: "127.0.0.1",
        headers: {},
        cookies: {},
        res: { setHeader: jest.fn() },
      };

      await expect(
        controller.login({ adminKey: "test-admin-key", totpCode: "000000" }, req),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
    });
  });

  describe("refresh", () => {
    it("should refresh access token", async () => {
      const result = await controller.refresh(
        { refreshToken: "valid-refresh-token" },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } },
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          accessToken: "mock-access-token",
          refreshToken: "valid-refresh-token",
          expiresIn: 86400,
        }),
      );
      expect(jwtService.verify).toHaveBeenCalledWith("valid-refresh-token");
    });

    it("should reject a revoked refresh token", async () => {
      mockGetRedisClient.mockReturnValue(null);

      await controller.logout(
        { refreshToken: "valid-refresh-token" },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } },
      );

      await expect(
        controller.refresh(
          { refreshToken: "valid-refresh-token" },
          { headers: {}, cookies: {}, res: { setHeader: jest.fn() } },
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
    });
  });

  describe("verify", () => {
    it("should return invalid when token is missing", async () => {
      const result = await controller.verify({}, { headers: {}, cookies: {}, res: {} });
      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          valid: false,
        }),
      );
    });

    it("should return invalid after logout revokes the access token", async () => {
      mockGetRedisClient.mockReturnValue(null);

      await controller.logout(
        { token: "valid-access-token" },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } },
      );

      const result = await controller.verify(
        { token: "valid-access-token" },
        { headers: {}, cookies: {}, res: {} },
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          valid: false,
        }),
      );
    });
  });

  describe("logout", () => {
    it("should logout successfully and revoke both token types", async () => {
      const result = await controller.logout(
        { token: "valid-access-token", refreshToken: "valid-refresh-token" },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } },
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
        }),
      );
      expect(mockRedis.setex).toHaveBeenCalledWith("admin:token:blacklist:access-jti", 86400, "1");
      expect(mockRedis.setex).toHaveBeenCalledWith("admin:token:blacklist:refresh-jti", 604800, "1");
      expect(adminLogService.log).toHaveBeenCalledWith(
        "logout_success",
        "auth",
        "admin",
        expect.objectContaining({
          jti: "access-jti",
          refreshJti: "refresh-jti",
        }),
      );
    });
  });
});
