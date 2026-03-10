import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminEpisodesController } from './admin-episodes.controller';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('AdminEpisodesController', () => {
  let controller: AdminEpisodesController;
  let prisma: PrismaService;

  const existingEpisode = {
    id: 'series-1e7',
    seriesId: 'series-1',
    number: 7,
    title: 'Original Episode',
    releasedAt: new Date('2024-01-01T00:00:00.000Z'),
    pricePts: 25,
    ttfEligible: true,
    ttfReadyAt: new Date('2024-01-02T00:00:00.000Z'),
    previewFreePages: 3,
    pages: [{ src: 'page-1.jpg' }],
    paragraphs: ['paragraph-1'],
    text: 'original text',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminEpisodesController],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('token'),
            verify: jest.fn().mockReturnValue({ sub: 'admin', role: 'admin' }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            episode: {
              findFirst: jest.fn().mockResolvedValue({ id: 'series-1e7' }),
              findMany: jest.fn().mockResolvedValue([existingEpisode]),
              findUnique: jest.fn().mockResolvedValue(existingEpisode),
              upsert: jest.fn().mockResolvedValue(existingEpisode),
              update: jest.fn().mockResolvedValue(existingEpisode),
              createMany: jest.fn().mockResolvedValue({ count: 1 }),
              deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            series: {
              update: jest.fn().mockResolvedValue({ id: 'series-1', latestEpisodeId: 'series-1e7' }),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AdminEpisodesController>(AdminEpisodesController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('accepts flat create payloads from the admin frontend', async () => {
    prisma.episode.findUnique = jest.fn().mockResolvedValueOnce(null) as never;
    prisma.episode.findMany = jest.fn().mockResolvedValueOnce([{ id: 'series-1e2' }]).mockResolvedValueOnce([]) as never;

    await controller.createEpisode(
      {
        number: 2,
        title: 'Flat Payload Episode',
        pricePts: 10,
        previewFreePages: 1,
        ttfEligible: true,
        pages: [{ src: 'page-1.jpg' }],
        paragraphs: ['line-1'],
        text: 'body',
      },
      { params: { id: 'series-1' } } as never,
    );

    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'series-1e2' },
        create: expect.objectContaining({
          id: 'series-1e2',
          seriesId: 'series-1',
          number: 2,
          title: 'Flat Payload Episode',
          pricePts: 10,
          previewFreePages: 1,
          ttfEligible: true,
          pages: [{ src: 'page-1.jpg' }],
          paragraphs: ['line-1'],
          text: 'body',
        }),
      }),
    );
  });

  it('preserves existing fields during partial updates', async () => {
    prisma.episode.findUnique = jest.fn().mockResolvedValueOnce(existingEpisode) as never;
    prisma.episode.update = jest
      .fn()
      .mockResolvedValueOnce({ ...existingEpisode, title: 'Updated Episode' }) as never;

    await controller.updateEpisode(
      { title: 'Updated Episode' },
      { params: { id: 'series-1', episodeId: 'series-1e7' } } as never,
    );

    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'series-1e7' },
        data: expect.objectContaining({
          seriesId: 'series-1',
          number: 7,
          title: 'Updated Episode',
          releasedAt: existingEpisode.releasedAt,
          pricePts: 25,
          ttfEligible: true,
          ttfReadyAt: existingEpisode.ttfReadyAt,
          previewFreePages: 3,
          pages: [{ src: 'page-1.jpg' }],
          paragraphs: ['paragraph-1'],
          text: 'original text',
        }),
      }),
    );
  });

  it('clears nullable and collection fields explicitly instead of writing invalid null payloads', async () => {
    prisma.episode.findUnique = jest.fn().mockResolvedValueOnce(existingEpisode) as never;
    prisma.episode.update = jest
      .fn()
      .mockResolvedValueOnce({
        ...existingEpisode,
        ttfReadyAt: null,
        pages: [],
        paragraphs: [],
        text: null,
      }) as never;

    await controller.updateEpisode(
      {
        ttfReadyAt: '',
        pages: null,
        paragraphs: null,
        text: null,
      },
      { params: { id: 'series-1', episodeId: 'series-1e7' } } as never,
    );

    expect(prisma.episode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ttfReadyAt: null,
          pages: [],
          paragraphs: [],
          text: null,
        }),
      }),
    );
  });
});

