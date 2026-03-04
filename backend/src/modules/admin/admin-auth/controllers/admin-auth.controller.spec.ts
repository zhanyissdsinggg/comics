import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminAuthController } from './admin-auth.controller';
import { AdminLogService } from '../../../../common/services/admin-log.service';

// Mock Redis客户端
jest.mock('../../../../common/redis/client', () => ({
  getRedisClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    setex: jest.fn().mockResolvedValue('OK'),
  }),
}));

describe('AdminAuthController', () => {
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
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn().mockReturnValue({ role: 'admin', jti: 'test-jti', type: 'refresh' }),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('应该成功登录并返回token', async () => {
      process.env.ADMIN_KEY = 'test-admin-key';

      const req = {
        ip: '127.0.0.1',
        res: {
          setHeader: jest.fn(),
        },
      };

      const result = await controller.login({ adminKey: 'test-admin-key' }, req);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('expiresIn', 86400);
      expect(jwtService.sign).toHaveBeenCalled();
      expect(adminLogService.log).toHaveBeenCalledWith(
        'login_success',
        'auth',
        'admin',
        expect.any(Object)
      );
    });

    it('应该在ADMIN_KEY未设置时抛出异常', async () => {
      delete process.env.ADMIN_KEY;

      const req = {
        ip: '127.0.0.1',
        res: {
          setHeader: jest.fn(),
        },
      };

      await expect(
        controller.login({ adminKey: 'any-key' }, req)
      ).rejects.toThrow(HttpException);
    });

    it('应该在密钥错误时抛出异常', async () => {
      process.env.ADMIN_KEY = 'correct-key';

      const req = {
        ip: '127.0.0.1',
        res: {
          setHeader: jest.fn(),
        },
      };

      await expect(
        controller.login({ adminKey: 'wrong-key' }, req)
      ).rejects.toThrow(HttpException);

      expect(adminLogService.log).toHaveBeenCalledWith(
        'login_failed',
        'auth',
        'admin',
        expect.any(Object)
      );
    });

    it('应该在登录失败次数过多时返回速率限制错误', async () => {
      process.env.ADMIN_KEY = 'correct-key';

      // Mock Redis返回失败次数过多
      const { getRedisClient } = require('../../../../common/redis/client');
      getRedisClient().get.mockResolvedValueOnce('10');

      const req = {
        ip: '127.0.0.1',
        res: {
          setHeader: jest.fn(),
        },
      };

      await expect(
        controller.login({ adminKey: 'any-key' }, req)
      ).rejects.toThrow(HttpException);
    });

    it('应该在成功登录后清除失败计数', async () => {
      process.env.ADMIN_KEY = 'test-admin-key';

      const { getRedisClient } = require('../../../../common/redis/client');
      const redis = getRedisClient();

      const req = {
        ip: '127.0.0.1',
        res: {
          setHeader: jest.fn(),
        },
      };

      await controller.login({ adminKey: 'test-admin-key' }, req);

      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('应该成功刷新token', async () => {
      jest.spyOn(jwtService, 'verify').mockReturnValue({ role: 'admin', jti: 'test-jti', type: 'refresh' });

      const result = await controller.refresh(
        { refreshToken: 'valid-refresh-token' },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } }
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresIn', 86400);
      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('应该在refresh token无效时抛出异常', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        controller.refresh(
          { refreshToken: 'invalid-token' },
          { headers: {}, cookies: {}, res: { setHeader: jest.fn() } }
        )
      ).rejects.toThrow(HttpException);
    });

    it('应该在refresh token类型错误时抛出异常', async () => {
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        role: 'admin',
        type: 'access', // 错误的类型
      });

      await expect(
        controller.refresh(
          { refreshToken: 'wrong-type-token' },
          { headers: {}, cookies: {}, res: { setHeader: jest.fn() } }
        )
      ).rejects.toThrow(HttpException);
    });
  });

  describe('verify', () => {
    it('应该成功验证有效的token', async () => {
      const result = await controller.verify(
        { token: 'valid-token' },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } }
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('payload');
      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    });

    it('应该在token无效时返回false', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await controller.verify(
        { token: 'invalid-token' },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } }
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('valid', false);
    });
  });

  describe('logout', () => {
    it('应该成功登出并将token加入黑名单', async () => {
      const { getRedisClient } = require('../../../../common/redis/client');
      const redis = getRedisClient();

      const result = await controller.logout(
        { token: 'valid-token' },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } }
      );

      expect(result).toHaveProperty('success', true);
      expect(redis.setex).toHaveBeenCalled();
      expect(adminLogService.log).toHaveBeenCalledWith(
        'logout_success',
        'auth',
        'admin',
        expect.any(Object)
      );
    });

    it('应该在token无效时抛出异常', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        controller.logout(
          { token: 'invalid-token' },
          { headers: {}, cookies: {}, res: { setHeader: jest.fn() } }
        )
      ).rejects.toThrow(HttpException);
    });

    it('应该在token没有jti时仍然成功登出', async () => {
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        role: 'admin',
        // 没有jti
      });

      const result = await controller.logout(
        { token: 'old-token' },
        { headers: {}, cookies: {}, res: { setHeader: jest.fn() } }
      );

      expect(result).toHaveProperty('success', true);
    });
  });
});
