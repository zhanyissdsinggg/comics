import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

// Mock bcrypt模块，避免原生模块加载问题
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-key'),
  compare: jest.fn((password: string, hash: string) => {
    // 只有当密码是'test-admin-key'或'correct-key'时才返回true
    return Promise.resolve(password === 'test-admin-key' || password === 'correct-key');
  }),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn().mockReturnValue({ sub: 'admin', role: 'admin' }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('应该成功登录并返回token', async () => {
      // 直接使用mock的哈希值，避免调用真实bcrypt
      process.env.ADMIN_KEY_HASH = 'hashed-key';

      const result = await service.login('test-admin-key');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('应该在密钥为空时抛出异常', async () => {
      await expect(service.login('')).rejects.toThrow(UnauthorizedException);
    });

    it('应该在密钥错误时抛出异常', async () => {
      process.env.ADMIN_KEY_HASH = 'hashed-key';

      await expect(service.login('wrong-key')).rejects.toThrow(UnauthorizedException);
    });

    it('应该在登录失败5次后锁定账户', async () => {
      process.env.ADMIN_KEY_HASH = 'hashed-key';

      // 尝试5次错误登录
      for (let i = 0; i < 5; i++) {
        try {
          await service.login('wrong-key');
        } catch (e) {
          // 忽略异常
        }
      }

      // 第6次应该被锁定
      await expect(service.login('correct-key')).rejects.toThrow(HttpException);
    });

    it('应该在ADMIN_KEY_HASH未设置时抛出异常', async () => {
      delete process.env.ADMIN_KEY_HASH;

      await expect(service.login('any-key')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('应该成功验证有效的token', async () => {
      const token = 'valid-token';
      const result = await service.validateToken(token);

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith(token);
    });

    it('应该在token无效时返回false', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.validateToken('invalid-token');
      expect(result).toBe(false);
    });
  });

  describe('refresh', () => {
    it('应该成功刷新token', async () => {
      const refreshToken = 'valid-refresh-token';
      const result = await service.refresh(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresIn');
    });

    it('应该在刷新token无效时抛出异常', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
