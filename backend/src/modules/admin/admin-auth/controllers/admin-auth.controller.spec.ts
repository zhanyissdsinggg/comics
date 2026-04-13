import { HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import { isAdminTotpEnabled, verifyAdminTotpCode } from "../../../../common/utils/admin-security";
import { getRedisClient, isRedisConfigured } from "../../../../common/redis/client";
import { AdminAuthController } from "./admin-auth.controller";
import { resetAdminTokenRevocationStore } from "../../utils/admin-token-revocation";
import { AdminMembersService } from "../../admin-system/services/admin-members.service";

const mockRedis = {
  get: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  setex: jest.fn(),
};

jest.mock("../../../../common/redis/client", () => ({
  getRedisClient: jest.fn(() => mockRedis),
  isRedisConfigured: jest.fn(() => true),
}));

jest.mock("../../../../common/utils/admin-security", () => ({
  validateAdminKeyFormat: jest.fn(() => true),
  isAdminTotpEnabled: jest.fn(),
  verifyAdminTotpCode: jest.fn(),
}));

describe("AdminAuthController", () => {
  let controller: AdminAuthController;
  let jwtService: { sign: jest.Mock; verify: jest.Mock };
  let adminLogService: { log: jest.Mock };
  let adminMembersService: {
    resolveLoginMemberByEmail: jest.Mock;
    touchLastLogin: jest.Mock;
    resolveSessionProfile: jest.Mock;
    isMemberTotpEnabled: jest.Mock;
    verifyMemberTotp: jest.Mock;
  };
  const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
  const mockIsRedisConfigured = isRedisConfigured as jest.MockedFunction<typeof isRedisConfigured>;

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
                return {
                  role: "admin",
                  adminRole: "content_admin",
                  adminId: "admin-1-test",
                  type: "refresh",
                  jti: "refresh-jti",
                };
              }
              return {
                role: "admin",
                adminRole: "content_admin",
                adminId: "admin-1-test",
                jti: "access-jti",
              };
            }),
          },
        },
        {
          provide: AdminLogService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AdminMembersService,
          useValue: {
            resolveLoginMemberByEmail: jest.fn(),
            touchLastLogin: jest.fn().mockResolvedValue(undefined),
            resolveSessionProfile: jest.fn(),
            isMemberTotpEnabled: jest.fn(() => false),
            verifyMemberTotp: jest.fn(() => true),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminAuthController>(AdminAuthController);
    jwtService = module.get(JwtService);
    adminLogService = module.get(AdminLogService);
    adminMembersService = module.get(AdminMembersService);

    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.setex.mockResolvedValue("OK");
    mockGetRedisClient.mockReturnValue(mockRedis as any);
    mockIsRedisConfigured.mockReturnValue(true);

    (isAdminTotpEnabled as jest.Mock).mockReturnValue(false);
    (verifyAdminTotpCode as jest.Mock).mockReturnValue(true);
    adminMembersService.resolveLoginMemberByEmail.mockResolvedValue({
      adminId: "admin-1-test",
      adminRole: "content_admin",
      member: {
        id: "admin-1-test",
        name: "内容运营",
        role: "content_admin",
        status: "active",
        keySlot: 1,
        totpEnabled: false,
        totpSecret: null,
      },
      session: {
        adminId: "admin-1-test",
        adminRole: "content_admin",
        permissions: [],
        routePatterns: ["/admin/series"],
        homePath: "/admin/series",
        adminName: "内容运营",
        adminEmail: null,
        memberStatus: "active",
        authMode: "env_admin_key",
        keySlot: 1,
        totpEnabled: false,
      },
    });
    adminMembersService.resolveSessionProfile.mockImplementation(async (adminId: string) => ({
      adminRole: "content_admin",
      member: null,
      session: {
        adminId,
        adminRole: "content_admin",
        permissions: [],
        routePatterns: ["/admin/series"],
        homePath: "/admin/series",
      },
    }));
    delete process.env.ADMIN_TOKEN_FALLBACK_ENABLED;
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetAdminTokenRevocationStore();
    delete process.env.ADMIN_TOKEN_FALLBACK_ENABLED;
  });

  describe("login", () => {
    it("should login successfully with valid email and password and set auth cookies", async () => {
      const req = {
        ip: "127.0.0.1",
        headers: {},
        cookies: {},
        res: { setHeader: jest.fn() },
      };

      const result = await controller.login(
        { email: "admin@example.com", password: "Password123!", totpCode: "" },
        req,
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          expiresIn: 86400,
          sessionTransport: "cookie",
          session: expect.objectContaining({
            adminId: "admin-1-test",
            adminRole: "content_admin",
            homePath: "/admin/series",
          }),
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
      expect(adminMembersService.touchLastLogin).toHaveBeenCalledWith("admin-1-test");
    });

    it("should reject invalid credentials", async () => {
      const req = {
        ip: "127.0.0.1",
        headers: {},
        cookies: {},
        res: { setHeader: jest.fn() },
      };

      adminMembersService.resolveLoginMemberByEmail.mockResolvedValueOnce(null);

      await expect(
        controller.login({ email: "bad@example.com", password: "wrong-password" }, req),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it("should enforce TOTP when enabled", async () => {
      adminMembersService.isMemberTotpEnabled.mockReturnValue(true);
      adminMembersService.verifyMemberTotp.mockReturnValue(false);

      const req = {
        ip: "127.0.0.1",
        headers: {},
        cookies: {},
        res: { setHeader: jest.fn() },
      };

      await expect(
        controller.login(
          { email: "admin@example.com", password: "Password123!", totpCode: "000000" },
          req,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
      });

      adminMembersService.isMemberTotpEnabled.mockReturnValue(false);
      adminMembersService.verifyMemberTotp.mockReturnValue(true);
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
          session: expect.objectContaining({
            adminRole: "content_admin",
            homePath: "/admin/series",
          }),
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
      mockIsRedisConfigured.mockReturnValue(false);

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
          session: expect.objectContaining({
            adminRole: "content_admin",
            homePath: "/admin/series",
          }),
        }),
      );
    });

    it("should return invalid after logout revokes the access token", async () => {
      mockGetRedisClient.mockReturnValue(null);
      mockIsRedisConfigured.mockReturnValue(false);

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
