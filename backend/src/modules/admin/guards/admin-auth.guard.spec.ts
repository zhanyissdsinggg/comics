import { Test, TestingModule } from "@nestjs/testing";
import { AdminAuthGuard } from "./admin-auth.guard";
import { JwtService } from "@nestjs/jwt";
import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { getRedisClient } from "../../../common/redis/client";
import { isAdminAuthorized } from "../../../common/utils/admin";
import { getAdminIdentityFromKey } from "../../../common/utils/admin-security";

jest.mock("../../../common/redis/client", () => ({
  getRedisClient: jest.fn(),
}));

jest.mock("../../../common/utils/admin", () => ({
  isAdminAuthorized: jest.fn(),
}));

jest.mock("../../../common/utils/admin-security", () => ({
  getAdminIdentityFromKey: jest.fn(),
}));

describe("AdminAuthGuard", () => {
  let guard: AdminAuthGuard;
  let jwtService: JwtService;
  const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;
  const mockIsAdminAuthorized = isAdminAuthorized as jest.MockedFunction<typeof isAdminAuthorized>;
  const mockGetAdminIdentityFromKey = getAdminIdentityFromKey as jest.MockedFunction<typeof getAdminIdentityFromKey>;

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
      ],
    }).compile();

    guard = module.get<AdminAuthGuard>(AdminAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    mockIsAdminAuthorized.mockReturnValue(false);
    mockGetAdminIdentityFromKey.mockReturnValue("legacy-admin");
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
      } as ExecutionContext;
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
        authSource: "legacy_admin_key",
      });
    });
  });
});
