import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AdminMarketingService } from '../admin-system/services/admin-marketing.service';
import { AdminAuditInterceptor } from '../interceptors/admin-audit.interceptor';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminMarketingController } from './admin-marketing.controller';

describe('AdminMarketingController', () => {
  let app: INestApplication | undefined;
  let marketingService: Record<string, jest.Mock>;

  beforeEach(async () => {
    marketingService = {
      getCampaigns: jest.fn().mockResolvedValue({ campaigns: [], total: 0 }),
      createCampaign: jest.fn().mockResolvedValue({ id: 'campaign-1', name: 'Spring Push' }),
      getCampaignDetail: jest.fn(),
      updateCampaign: jest.fn(),
      deleteCampaign: jest.fn(),
      getCampaignAnalytics: jest.fn(),
      saveMarketingAnalytics: jest.fn().mockResolvedValue({ id: 'analytics-1' }),
      getTargetUsers: jest.fn(),
      addTargetUsers: jest.fn().mockResolvedValue({ count: 1 }),
      updateTargetUserStatus: jest.fn(),
      getCampaignBudget: jest.fn(),
      updateCampaignBudget: jest.fn().mockResolvedValue({ campaignId: 'campaign-1', totalBudget: 500 }),
      getMarketingStats: jest.fn(),
      getCampaignsBySegment: jest.fn(),
      getCampaignsByType: jest.fn(),
    };

    const builder = Test.createTestingModule({
      controllers: [AdminMarketingController],
      providers: [
        {
          provide: AdminMarketingService,
          useValue: marketingService,
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

  it('rejects invalid pagination filters before hitting the service', async () => {
    await request(app!.getHttpServer()).get('/admin/marketing/campaigns?limit=0').expect(400);

    expect(marketingService.getCampaigns).not.toHaveBeenCalled();
  });

  it('transforms and whitelists campaign creation payloads', async () => {
    await request(app!.getHttpServer())
      .post('/admin/marketing/campaigns')
      .send({
        name: 'Spring Push',
        budget: '1200',
        emailBudget: '300',
        startDate: '2026-03-01',
        extraField: 'drop-me',
      })
      .expect(201)
      .expect({ campaign: { id: 'campaign-1', name: 'Spring Push' } });

    expect(marketingService.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Spring Push',
        budget: 1200,
        emailBudget: 300,
        startDate: '2026-03-01',
      }),
    );
    expect(marketingService.createCampaign.mock.calls[0][0]).not.toHaveProperty('extraField');
  });

  it('rejects empty target user batches', async () => {
    await request(app!.getHttpServer())
      .post('/admin/marketing/campaigns/campaign-1/targets')
      .send({ userIds: [] })
      .expect(400);

    expect(marketingService.addTargetUsers).not.toHaveBeenCalled();
  });

  it('rejects negative budget updates', async () => {
    await request(app!.getHttpServer())
      .patch('/admin/marketing/campaigns/campaign-1/budget')
      .send({ totalBudget: -1 })
      .expect(400);

    expect(marketingService.updateCampaignBudget).not.toHaveBeenCalled();
  });

  it('rejects malformed analytics payloads', async () => {
    await request(app!.getHttpServer())
      .post('/admin/marketing/campaigns/campaign-1/analytics')
      .send({
        dateKey: 'not-a-date',
        data: { revenue: 'oops' },
      })
      .expect(400);

    expect(marketingService.saveMarketingAnalytics).not.toHaveBeenCalled();
  });
});
