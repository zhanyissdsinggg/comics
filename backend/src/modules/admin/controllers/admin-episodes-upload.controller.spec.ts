import * as fs from 'fs';
import AdmZip = require("adm-zip");
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminEpisodesUploadController } from './admin-episodes-upload.controller';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('AdminEpisodesUploadController', () => {
  let controller: AdminEpisodesUploadController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminEpisodesUploadController],
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
            series: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'series-1',
                type: 'comic',
                episodePrice: 5,
                ttfEnabled: true,
              }),
              update: jest.fn().mockResolvedValue({ id: 'series-1', latestEpisodeId: 'series-1e1' }),
            },
            episode: {
              findMany: jest.fn().mockResolvedValue([]),
              findFirst: jest.fn().mockResolvedValue({ id: 'series-1e1' }),
              upsert: jest.fn().mockResolvedValue({ id: 'series-1e1' }),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AdminEpisodesUploadController>(AdminEpisodesUploadController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('rejects novel archives without text files', async () => {
    const zip = new AdmZip();
    zip.addFile('cover.png', Buffer.from('fake-image'));

    await expect(
      controller.uploadEpisodes(
        [{ originalname: 'chapter-1.zip', buffer: zip.toBuffer() }],
        {
          params: { id: 'series-1' },
          body: { type: 'novel' },
          protocol: 'https',
          headers: { host: 'api.example.com', 'x-forwarded-proto': 'https' },
          get: (name: string) => (name === 'host' ? 'api.example.com' : ''),
        } as never,
      ),
    ).rejects.toThrow(new BadRequestException('No text files found in chapter-1.zip.'));
  });

  it('stores uploaded comic pages as real public asset urls', async () => {
    const zip = new AdmZip();
    zip.addFile('001.png', Buffer.from('fake-image-data'));
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

    await controller.uploadEpisodes(
      [{ originalname: 'chapter-1.zip', buffer: zip.toBuffer() }],
      {
        params: { id: 'series-1' },
        body: { type: 'comic' },
        protocol: 'https',
        headers: { host: 'api.example.com', 'x-forwarded-proto': 'https' },
        get: (name: string) => (name === 'host' ? 'api.example.com' : ''),
      } as never,
    );

    expect(writeSpy).toHaveBeenCalled();
    expect(prisma.episode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          pages: [
            expect.objectContaining({
              url: expect.stringMatching(/^https:\/\/api\.example\.com\/uploads\/episodes\/series-1\//),
            }),
          ],
        }),
      }),
    );
  });
});
