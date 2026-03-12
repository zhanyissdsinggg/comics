import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AdminRecommendationService } from '../admin-content/services/admin-recommendation.service';
import { AdminAuditInterceptor } from '../interceptors/admin-audit.interceptor';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminRecommendationController } from './admin-recommendation.controller';

describe('AdminRecommendationController', () => {
  let app: INestApplication | undefined;
  let recommendationService: Record<string, jest.Mock>;

  beforeEach(async () => {
    recommendationService = {
      getRecommendationSlots: jest.fn().mockResolvedValue({ slots: [], total: 0 }),
      createRecommendationSlot: jest.fn().mockResolvedValue({ id: 'slot-1', slot: 'home-hero' }),
      updateRecommendationSlot: jest.fn(),
      deleteRecommendationSlot: jest.fn(),
      getRankingConfigs: jest.fn().mockResolvedValue({ configs: [], total: 0 }),
      createRankingConfig: jest.fn().mockResolvedValue({ id: 'ranking-1', ranking: 'weekly-top' }),
      updateRankingConfig: jest.fn(),
      deleteRankingConfig: jest.fn(),
      getRecommendationAnalytics: jest.fn().mockResolvedValue({ analytics: [], total: 0 }),
      saveRecommendationAnalytics: jest.fn().mockResolvedValue({ id: 'analytics-1' }),
      getSlotPerformance: jest.fn(),
      getRankingPerformance: jest.fn(),
      getPopularSeries: jest.fn().mockResolvedValue([]),
    };

    const builder = Test.createTestingModule({
      controllers: [AdminRecommendationController],
      providers: [
        {
          provide: AdminRecommendationService,
          useValue: recommendationService,
        },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });
    builder.overrideInterceptor(AdminAuditInterceptor).useValue({ intercept: (_context: unknown, next: { handle: () => unknown }) => next.handle() });

    const moduleRef: TestingModule = await builder.compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: false,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('rejects slot creation without a slot identifier or name', async () => {
    await request(app!.getHttpServer()).post('/admin/recommendations/slots').send({}).expect(400);

    expect(recommendationService.createRecommendationSlot).not.toHaveBeenCalled();
  });

  it('accepts valid slot payloads and strips unknown fields', async () => {
    await request(app!.getHttpServer())
      .post('/admin/recommendations/slots')
      .send({
        name: 'Home Hero',
        seriesIds: ['series-1', 'series-2'],
        algorithm: 'trending',
      })
      .expect(201)
      .expect({ slot: { id: 'slot-1', slot: 'home-hero' } });

    expect(recommendationService.createRecommendationSlot).toHaveBeenCalledWith({
      name: 'Home Hero',
      seriesIds: ['series-1', 'series-2'],
    });
  });

  it('rejects malformed ranking configs', async () => {
    await request(app!.getHttpServer())
      .post('/admin/recommendations/rankings')
      .send({
        name: 'Weekly Top',
        config: '{bad-json}',
      })
      .expect(400);

    expect(recommendationService.createRankingConfig).not.toHaveBeenCalled();
  });

  it('rejects malformed analytics payloads', async () => {
    await request(app!.getHttpServer())
      .post('/admin/recommendations/analytics')
      .send({
        slotId: 'slot-1',
        seriesId: 'series-1',
        dateKey: 'invalid-date',
        data: { impressions: -5 },
      })
      .expect(400);

    expect(recommendationService.saveRecommendationAnalytics).not.toHaveBeenCalled();
  });

  it('transforms popular-series filters before calling the service', async () => {
    await request(app!.getHttpServer())
      .get('/admin/recommendations/popular?adult=false&limit=12&rankingType=views')
      .expect(200)
      .expect({ series: [] });

    expect(recommendationService.getPopularSeries).toHaveBeenCalledWith({
      adult: false,
      limit: 12,
      rankingType: 'views',
    });
  });
});
