import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminSeriesController } from './admin-series.controller';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('AdminSeriesController', () => {
  let controller: AdminSeriesController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSeriesController],
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
            series: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              deleteMany: jest.fn(),
            },
            episode: {
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AdminSeriesController>(AdminSeriesController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return an array of series', async () => {
      const mockSeries = [
        { id: 'series1', title: 'Test Series 1' },
        { id: 'series2', title: 'Test Series 2' },
      ];

      jest.spyOn(prisma.series, 'findMany').mockResolvedValue(mockSeries as any);

      const result = await controller.list();

      expect(result).toEqual({ series: mockSeries });
      expect(prisma.series.findMany).toHaveBeenCalledWith({
        orderBy: { title: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('should create a new series', async () => {
      const mockSeries = {
        id: 'test-series',
        title: 'Test Series',
        type: 'comic',
      };

      const body = { series: mockSeries };

      jest.spyOn(prisma.series, 'create').mockResolvedValue(mockSeries as any);

      const result = await controller.create(body);

      expect(result).toEqual({ series: mockSeries });
      expect(prisma.series.create).toHaveBeenCalled();
    });

    it('should throw error if series.id is missing', async () => {
      const body = { series: { title: 'Test' } };

      await expect(controller.create(body)).rejects.toThrow();
    });
  });
});
