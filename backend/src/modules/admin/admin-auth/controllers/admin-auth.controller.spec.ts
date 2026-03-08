import { Test, TestingModule } from "@nestjs/testing";
import { HttpException, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import {
  getAdminKeysFromEnv,
  isAdminTotpEnabled,
  verifyAdminTotpCode,
} from "../../../../common/utils/admin-security";

jest.mock("../../../../common/redis/client", () => ({
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    setex: jest.fn().mockResolvedValue("OK"),
  }),
}));

jest.mock("../../../../common/utils/admin-security", () => ({
  getAdminKeysFromEnv: jest.fn(),
  validateAdminKeyFormat: jest.fn(() => true),
  isAdminTotpEnabled: jest.fn(),
  verifyAdminTotpCode: jest.fn(),
}));

describe("AdminAuthController", () => {
  let controller: AdminAuthController;
  let jwtService: JwtService;
  let adminLogService: AdminLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue("mock-token"),
            verify: jest.fn().mockReturnValue({ role: "admin", jti: "test-jti", type: "refresh" }),
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
    jwtService = module.get<JwtService>(JwtService);
    adminLogService = module.get<AdminLogService>(AdminLogService);

    (getAdminKeysFromEnv as jest.Mock).mockReturnValue(["test-admin-key"]);
    (isAdminTotpEnabled as jest.Mock).mockReturnValue(false);
    (verifyAdminTotpCode as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
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
          accessToken: expect.any(String),
          refreshToken: "valid-refresh-token",
          expiresIn: 86400,
        }),
      );
      expect(jwtService.verify).toHaveBeenCalledWith("valid-refresh-token");
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
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const result = await controller.logout(
        { token: "valid-token" },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } },
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
        }),
      );
      expect(adminLogService.log).toHaveBeenCalledWith(
        "logout_success",
        "auth",
        "admin",
        expect.any(Object),
      );
    });
  });
});
