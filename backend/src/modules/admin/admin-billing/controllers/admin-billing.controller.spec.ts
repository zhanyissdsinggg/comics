import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminBillingController } from './admin-billing.controller';
import { PrismaService } from '../../../../common/prisma/prisma.service';

// Mock配置函数
jest.mock('../../../../common/config/topup', () => ({
  listTopupPackages: jest.fn().mockResolvedValue([
    { id: 'pkg-1', name: 'Package 1', paidPts: 1000, bonusPts: 500, price: 9.99 },
    { id: 'pkg-2', name: 'Package 2', paidPts: 5000, bonusPts: 2500, price: 49.99 },
  ]),
}));

jest.mock('../../../../common/config/plans', () => ({
  getPlanCatalog: jest.fn().mockResolvedValue({
    free: { id: 'free', name: 'Free Plan', price: 0 },
    pro: { id: 'pro', name: 'Pro Plan', price: 9.99 },
  }),
}));

describe('AdminBillingController', () => {
  let controller: AdminBillingController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBillingController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue("token"),
            verify: jest.fn().mockReturnValue({ sub: "admin" }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            topupPackage: {
              upsert: jest.fn().mockResolvedValue({
                id: 'pkg-1',
                name: 'Package 1',
                paidPts: 1000,
                bonusPts: 500,
                price: 9.99,
                currency: 'USD',
                active: true,
                label: 'Popular',
                tags: ['bestseller'],
              }),
              update: jest.fn().mockResolvedValue({
                id: 'pkg-1',
                name: 'Package 1',
                paidPts: 1500,
                bonusPts: 750,
                price: 14.99,
                currency: 'USD',
                active: true,
                label: 'Updated',
                tags: ['bestseller', 'limited'],
              }),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AdminBillingController>(AdminBillingController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listTopups', () => {
    it('应该成功获取所有topup包', async () => {
      const result = await controller.listTopups();

      expect(result).toHaveProperty('packages');
      expect(Array.isArray(result.packages)).toBe(true);
      expect(result.packages.length).toBeGreaterThan(0);
    });

    it('应该返回包含必要字段的topup包', async () => {
      const result = await controller.listTopups();

      expect(result.packages[0]).toHaveProperty('id');
      expect(result.packages[0]).toHaveProperty('name');
      expect(result.packages[0]).toHaveProperty('paidPts');
      expect(result.packages[0]).toHaveProperty('bonusPts');
      expect(result.packages[0]).toHaveProperty('price');
    });
  });

  describe('createTopup', () => {
    it('应该成功创建topup包', async () => {
      const body = {
        packageId: 'pkg-1',
        name: 'Package 1',
        paidPts: 1000,
        bonusPts: 500,
        price: 9.99,
        currency: 'USD',
        active: true,
        label: 'Popular',
        tags: ['bestseller'],
      };

      const result = await controller.createTopup(body);

      expect(result).toHaveProperty('package');
      expect(result.package).toHaveProperty('id', 'pkg-1');
      expect(prisma.topupPackage.upsert).toHaveBeenCalled();
    });

    it('应该在没有packageId时抛出异常', async () => {
      const body = {
        name: 'Package 1',
        paidPts: 1000,
      };

      await expect(controller.createTopup(body)).rejects.toThrow('Package ID is required');
    });

    it('应该使用id字段作为packageId的备选', async () => {
      const body = {
        id: 'pkg-1',
        name: 'Package 1',
        paidPts: 1000,
      };

      await controller.createTopup(body);

      expect(prisma.topupPackage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pkg-1' },
        })
      );
    });

    it('应该使用默认值填充缺失的字段', async () => {
      const body = {
        packageId: 'pkg-1',
      };

      await controller.createTopup(body);

      expect(prisma.topupPackage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            currency: 'USD',
            active: true,
            label: '',
            tags: [],
          }),
        })
      );
    });

    it('应该正确处理数字类型转换', async () => {
      const body = {
        packageId: 'pkg-1',
        paidPts: '1000',
        bonusPts: '500',
        price: '9.99',
      };

      await controller.createTopup(body);

      expect(prisma.topupPackage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            paidPts: 1000,
            bonusPts: 500,
            price: 9.99,
          }),
        })
      );
    });

    it('应该处理tags数组', async () => {
      const body = {
        packageId: 'pkg-1',
        tags: ['bestseller', 'limited'],
      };

      await controller.createTopup(body);

      expect(prisma.topupPackage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            tags: ['bestseller', 'limited'],
          }),
        })
      );
    });

    it('应该在tags不是数组时使用空数组', async () => {
      const body = {
        packageId: 'pkg-1',
        tags: 'not-an-array',
      };

      await controller.createTopup(body);

      expect(prisma.topupPackage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            tags: [],
          }),
        })
      );
    });
  });

  describe('updateTopup', () => {
    it('应该成功更新topup包', async () => {
      const body = {
        paidPts: 1500,
        bonusPts: 750,
        price: 14.99,
        label: 'Updated',
        tags: ['bestseller', 'limited'],
      };

      const result = await controller.updateTopup('pkg-1', body);

      expect(result).toHaveProperty('package');
      expect(result.package).toHaveProperty('id', 'pkg-1');
      expect(prisma.topupPackage.update).toHaveBeenCalledWith({
        where: { id: 'pkg-1' },
        data: expect.any(Object),
      });
    });

    it('应该在没有id时抛出异常', async () => {
      const body = { paidPts: 1500 };

      await expect(controller.updateTopup('', body)).rejects.toThrow('Package ID is required');
    });

    it('应该只更新提供的字段', async () => {
      const body = {
        paidPts: 1500,
      };

      await controller.updateTopup('pkg-1', body);

      expect(prisma.topupPackage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paidPts: 1500,
          }),
        })
      );
    });

    it('应该在字段未定义时不更新', async () => {
      const body = {
        paidPts: 1500,
        bonusPts: undefined,
      };

      await controller.updateTopup('pkg-1', body);

      expect(prisma.topupPackage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paidPts: 1500,
            bonusPts: undefined,
          }),
        })
      );
    });

    it('应该正确处理boolean类型的active字段', async () => {
      const body = {
        active: false,
      };

      await controller.updateTopup('pkg-1', body);

      expect(prisma.topupPackage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            active: false,
          }),
        })
      );
    });
  });

  describe('listPlans', () => {
    it('应该成功获取所有计划', async () => {
      const result = await controller.listPlans();

      expect(result).toHaveProperty('plans');
      expect(Array.isArray(result.plans)).toBe(true);
      expect(result.plans.length).toBeGreaterThan(0);
    });

    it('应该返回计划对象数组', async () => {
      const result = await controller.listPlans();

      expect(result.plans[0]).toHaveProperty('id');
      expect(result.plans[0]).toHaveProperty('name');
    });
  });

  describe('createPlan', () => {
    it('应该抛出异常表示此端点已禁用', async () => {
      const body = { name: 'New Plan' };

      await expect(controller.createPlan(body)).rejects.toThrow('This endpoint is no longer available');
    });
  });

  describe('updatePlan', () => {
    it('应该抛出异常表示此端点已禁用', async () => {
      const body = { name: 'Updated Plan' };

      await expect(controller.updatePlan('plan-1', body)).rejects.toThrow('This endpoint is no longer available');
    });
  });
});
