import { Test, TestingModule } from '@nestjs/testing';
import { AdminAuthGuard } from './admin-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { getRedisClient } from '../../../common/redis/client';

jest.mock('../../../common/redis/client', () => ({
  getRedisClient: jest.fn(),
}));

describe('AdminAuthGuard', () => {
  let guard: AdminAuthGuard;
  let jwtService: JwtService;
  const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;

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
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRequest = {
        headers: {},
        body: {},
      };

      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({}),
        }),
      } as ExecutionContext;
    });

    it('should allow access with valid JWT token', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        role: 'admin',
        userId: 'admin',
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        userId: 'admin',
        role: 'admin',
        jti: undefined,
        authSource: 'bearer',
      });
    });

    it('should reject access with invalid role', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        role: 'user',
        userId: 'user123',
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it('should reject access without authorization', async () => {
      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it('should allow valid token when redis is unavailable', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        role: 'admin',
        jti: 'jti-1',
      });
      mockGetRedisClient.mockReturnValue(null);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        userId: 'admin',
        role: 'admin',
        jti: 'jti-1',
        authSource: 'bearer',
      });
    });

    it('should allow valid token when redis blacklist lookup fails', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        role: 'admin',
        jti: 'jti-2',
      });
      mockGetRedisClient.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('redis down')),
      } as any);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should reject token when it is blacklisted', async () => {
      mockRequest.headers.authorization = 'Bearer valid-token';
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        role: 'admin',
        jti: 'jti-3',
      });
      mockGetRedisClient.mockReturnValue({
        get: jest.fn().mockResolvedValue('1'),
      } as any);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });
  });
});
