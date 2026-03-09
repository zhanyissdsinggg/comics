import { ConflictException } from '@nestjs/common';
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

    it('should throw conflict error when series id already exists', async () => {
      const body = {
        series: {
          id: 'duplicate-series',
          title: 'Duplicate Series',
        },
      };

      jest.spyOn(prisma.series, 'create').mockRejectedValue({ code: 'P2002' });

      await expect(controller.create(body)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('should update an existing series', async () => {
      const existingSeries = {
        id: 'series-1',
        title: 'Old Title',
        type: 'comic',
        adult: false,
        genres: ['Action'],
        badge: 'HOT',
        badges: ['HOT'],
        status: 'Ongoing',
        rating: 4.5,
        ratingCount: 100,
        description: 'Old description',
        episodePrice: 3,
        ttfEnabled: true,
        ttfIntervalHours: 24,
        latestEpisodeId: 'ep-1',
      };
      const updatedSeries = {
        ...existingSeries,
        title: 'New Title',
        adult: true,
      };

      jest.spyOn(prisma.series, 'findUnique').mockResolvedValue(existingSeries as any);
      jest.spyOn(prisma.series, 'update').mockResolvedValue(updatedSeries as any);

      const result = await controller.update(
        { series: { title: 'New Title', adult: true } },
        { params: { id: 'series-1' } } as any,
      );

      expect(result).toEqual({ series: updatedSeries });
      expect(prisma.series.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'series-1' },
          data: expect.objectContaining({
            id: 'series-1',
            title: 'New Title',
            adult: true,
            genres: ['Action'],
          }),
        }),
      );
    });

    it('should throw not found when updating a missing series', async () => {
      jest.spyOn(prisma.series, 'findUnique').mockResolvedValue(null as any);

      await expect(
        controller.update({ series: { title: 'Missing' } }, { params: { id: 'missing' } } as any),
      ).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should delete episodes before deleting the series', async () => {
      jest.spyOn(prisma.episode, 'deleteMany').mockResolvedValue({ count: 3 } as any);
      jest.spyOn(prisma.series, 'deleteMany').mockResolvedValue({ count: 1 } as any);

      const result = await controller.remove({ params: { id: 'series-1' } } as any);

      expect(result).toEqual({ ok: true });
      expect(prisma.episode.deleteMany).toHaveBeenCalledWith({ where: { seriesId: 'series-1' } });
      expect(prisma.series.deleteMany).toHaveBeenCalledWith({ where: { id: 'series-1' } });
    });
  });
});
