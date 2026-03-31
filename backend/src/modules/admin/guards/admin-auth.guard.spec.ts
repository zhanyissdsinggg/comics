import { Test, TestingModule } from "@nestjs/testing";
import { AdminAuthGuard } from "./admin-auth.guard";
import { JwtService } from "@nestjs/jwt";
import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getRedisClient } from "../../../common/redis/client";
import { isAdminAuthorized } from "../../../common/utils/admin";
import { getAdminIdentityFromKey, getAdminRoleFromKey } from "../../../common/utils/admin-security";

jest.mock("../../../common/redis/client", () => ({
  getRedisClient: jest.fn(),
}));

jest.mock("../../../common/utils/admin", () => ({
  isAdminAuthorized: jest.fn(),
}));

jest.mock("../../../common/utils/admin-security", () => ({
  getAdminIdentityFromKey: jest.fn(),
  getAdminRoleFromKey: jest.fn(),
}));

describe("AdminAuthGuard", () => {
  let guard: AdminAuthGuard;
  let jwtService: JwtService;
  const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
  const mockIsAdminAuthorized = isAdminAuthorized as jest.MockedFunction<typeof isAdminAuthorized>;
  const mockGetAdminIdentityFromKey = getAdminIdentityFromKey as jest.MockedFunction<typeof getAdminIdentityFromKey>;
  const mockGetAdminRoleFromKey = getAdminRoleFromKey as jest.MockedFunction<typeof getAdminRoleFromKey>;
  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AdminAuthGuard>(AdminAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    mockIsAdminAuthorized.mockReturnValue(false);
    mockGetAdminIdentityFromKey.mockReturnValue("legacy-admin");
    mockGetAdminRoleFromKey.mockReturnValue("support_admin" as any);
    delete process.env.ADMIN_TOKEN_FALLBACK_ENABLED;
    delete process.env.ADMIN_LEGACY_BEARER_ENABLED;
  });

  afterEach(() => {
    delete process.env.ADMIN_TOKEN_FALLBACK_ENABLED;
    delete process.env.ADMIN_LEGACY_BEARER_ENABLED;
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("canActivate", () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockReflector.getAllAndOverride.mockReturnValue([]);
      mockRequest = {
        headers: {},
        cookies: {},
        body: {},
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({}),
        }),
        getHandler: () => jest.fn(),
        getClass: () => class AdminTestContext {},
      } as unknown as ExecutionContext;
    });

    it("should allow access with a valid admin cookie", async () => {
      mockRequest.cookies.admin_access_token = "valid-cookie-token";
      jest.spyOn(jwtService, "verify").mockReturnValue({
        role: "admin",
        adminId: "admin-cookie",
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        userId: "admin-cookie",
        role: "admin",
        adminRole: "super_admin",
        permissions: expect.any(Array),
        jti: undefined,
        authSource: "cookie",
      });
    });

    it("should reject access with invalid role", async () => {
      mockRequest.cookies.admin_access_token = "valid-cookie-token";
      jest.spyOn(jwtService, "verify").mockReturnValue({
        role: "user",
        adminId: "user123",
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it("should reject access without authorization", async () => {
      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it("should allow bearer fallback when explicitly enabled", async () => {
      process.env.ADMIN_TOKEN_FALLBACK_ENABLED = "1";
      mockRequest.headers.authorization = "Bearer valid-token";
      jest.spyOn(jwtService, "verify").mockReturnValue({
        role: "admin",
        adminId: "admin-bearer",
        jti: "jti-1",
      });
      mockGetRedisClient.mockReturnValue(null);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        userId: "admin-bearer",
        role: "admin",
        adminRole: "super_admin",
        permissions: expect.any(Array),
        jti: "jti-1",
        authSource: "bearer",
      });
    });

    it("should prefer the cookie token over the bearer fallback", async () => {
      process.env.ADMIN_TOKEN_FALLBACK_ENABLED = "1";
      mockRequest.cookies.admin_access_token = "cookie-token";
      mockRequest.headers.authorization = "Bearer bearer-token";
      jest.spyOn(jwtService, "verify").mockImplementation((token: string) => {
        if (token === "cookie-token") {
          return {
            role: "admin",
            adminId: "cookie-admin",
            jti: "cookie-jti",
          };
        }
        throw new Error("bearer should not be used first");
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        userId: "cookie-admin",
        role: "admin",
        adminRole: "super_admin",
        permissions: expect.any(Array),
        jti: "cookie-jti",
        authSource: "cookie",
      });
    });

    it("should reject token when it is blacklisted", async () => {
      mockRequest.cookies.admin_access_token = "valid-token";
      jest.spyOn(jwtService, "verify").mockReturnValue({
        role: "admin",
        adminId: "admin",
        jti: "jti-3",
      });
      mockGetRedisClient.mockReturnValue({
        get: jest.fn().mockResolvedValue("1"),
      } as any);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it("should allow the legacy admin key fallback only when explicitly enabled", async () => {
      process.env.ADMIN_LEGACY_BEARER_ENABLED = "1";
      mockRequest.headers.authorization = "Bearer raw-admin-key";
      mockIsAdminAuthorized.mockReturnValue(true);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        userId: "legacy-admin",
        role: "admin",
        adminRole: "support_admin",
        permissions: expect.any(Array),
        authSource: "legacy_admin_key",
      });
    });

    it("should reject access when the role lacks required permissions", async () => {
      mockRequest.cookies.admin_access_token = "valid-cookie-token";
      jest.spyOn(jwtService, "verify").mockReturnValue({
        role: "admin",
        adminRole: "support_admin",
        adminId: "admin-cookie",
      });
      mockReflector.getAllAndOverride.mockReturnValueOnce(["series:update"]);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });
  });
});
