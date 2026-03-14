import { HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import {
  getAdminIdentityFromKey,
  getAdminKeysFromEnv,
  isAdminTotpEnabled,
  verifyAdminTotpCode,
} from "../../../../common/utils/admin-security";
import { getRedisClient } from "../../../../common/redis/client";
import { AdminAuthController } from "./admin-auth.controller";
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
  getAdminIdentityFromKey: jest.fn(),
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
              payload?.type === "refresh" ? "mock-refresh-token" : "mock-access-token",
            ),
            verify: jest.fn((token: string) => {
              if (token === "valid-refresh-token" || token === "mock-refresh-token") {
                return { role: "admin", adminId: "admin-1-test", type: "refresh", jti: "refresh-jti" };
              }
              return { role: "admin", adminId: "admin-1-test", jti: "access-jti" };
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
    (getAdminIdentityFromKey as jest.Mock).mockReturnValue("admin-1-test");
    (isAdminTotpEnabled as jest.Mock).mockReturnValue(false);
    (verifyAdminTotpCode as jest.Mock).mockReturnValue(true);
    delete process.env.ADMIN_TOKEN_FALLBACK_ENABLED;
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetAdminTokenRevocationStore();
    delete process.env.ADMIN_TOKEN_FALLBACK_ENABLED;
  });

  describe("login", () => {
    it("should login successfully with valid admin key and set auth cookies", async () => {
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
          expiresIn: 86400,
          sessionTransport: "cookie",
        }),
      );
      expect(result).not.toHaveProperty("accessToken");
      expect(result).not.toHaveProperty("refreshToken");
      expect(req.res.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        expect.arrayContaining([
          expect.stringContaining("admin_access_token=mock-access-token"),
          expect.stringContaining("admin_refresh_token=mock-refresh-token"),
        ]),
      );
      expect(adminLogService.log).toHaveBeenCalledWith(
        "login_success",
        "auth",
        "admin-1-test",
        expect.objectContaining({ adminId: "admin-1-test" }),
        expect.anything(),
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
    it("should refresh access token using the refresh cookie", async () => {
      const req = {
        headers: {},
        cookies: { admin_refresh_token: "valid-refresh-token" },
        res: { setHeader: jest.fn() },
      };

      const result = await controller.refresh({}, req);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          expiresIn: 86400,
          sessionTransport: "cookie",
        }),
      );
      expect(result).not.toHaveProperty("accessToken");
      expect(result).not.toHaveProperty("refreshToken");
      expect(jwtService.verify).toHaveBeenCalledWith("valid-refresh-token");
      expect(req.res.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        expect.arrayContaining([
          expect.stringContaining("admin_access_token=mock-access-token"),
          expect.stringContaining("admin_refresh_token=valid-refresh-token"),
        ]),
      );
    });

    it("should reject a revoked refresh token", async () => {
      mockGetRedisClient.mockReturnValue(null);

      await controller.logout(
        {},
        {
          headers: {},
          cookies: {
            admin_access_token: "valid-access-token",
            admin_refresh_token: "valid-refresh-token",
          },
          res: { setHeader: jest.fn() },
        },
      );

      await expect(
        controller.refresh(
          {},
          {
            headers: {},
            cookies: { admin_refresh_token: "valid-refresh-token" },
            res: { setHeader: jest.fn() },
          },
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

    it("should verify the access cookie by default", async () => {
      const result = await controller.verify(
        {},
        {
          headers: {},
          cookies: { admin_access_token: "valid-access-token" },
          res: {},
        },
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          valid: true,
        }),
      );
    });

    it("should return invalid after logout revokes the access token", async () => {
      mockGetRedisClient.mockReturnValue(null);

      await controller.logout(
        {},
        {
          headers: {},
          cookies: {
            admin_access_token: "valid-access-token",
            admin_refresh_token: "valid-refresh-token",
          },
          res: { setHeader: jest.fn() },
        },
      );

      const result = await controller.verify(
        {},
        {
          headers: {},
          cookies: { admin_access_token: "valid-access-token" },
          res: {},
        },
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
    it("should logout successfully and revoke both token types from cookies", async () => {
      const req = {
        headers: {},
        cookies: {
          admin_access_token: "valid-access-token",
          admin_refresh_token: "valid-refresh-token",
        },
        res: { setHeader: jest.fn() },
      };

      const result = await controller.logout({}, req);

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
        }),
      );
      expect(mockRedis.setex).toHaveBeenCalledWith("admin:token:blacklist:access-jti", 86400, "1");
      expect(mockRedis.setex).toHaveBeenCalledWith("admin:token:blacklist:refresh-jti", 604800, "1");
      expect(req.res.setHeader).toHaveBeenCalledWith(
        "Set-Cookie",
        expect.arrayContaining([
          expect.stringContaining("admin_access_token="),
          expect.stringContaining("admin_refresh_token="),
          expect.stringContaining("Max-Age=0"),
        ]),
      );
      expect(adminLogService.log).toHaveBeenCalledWith(
        "logout_success",
        "auth",
        "admin-1-test",
        expect.objectContaining({
          jti: "access-jti",
          refreshJti: "refresh-jti",
          adminId: "admin-1-test",
        }),
        expect.anything(),
      );
    });

    it("should allow explicit token fallback when enabled", async () => {
      process.env.ADMIN_TOKEN_FALLBACK_ENABLED = "1";

      const result = await controller.logout(
        { token: "valid-access-token", refreshToken: "valid-refresh-token" },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } },
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
        }),
      );
    });
  });
});
