import { Controller, Get, Post, Body, Query, Req, Res } from '@nestjs/common';
import { AdminRevenueService } from '../services/admin-revenue.service';
import { AdminAudit } from '../decorators/admin-audit.decorator';

/**
 * 老王说：收入分析控制器
 * 这个SB控制器处理所有收入分析相关的API端点
 */
@Controller('admin/revenue')
export class AdminRevenueController {
  constructor(private revenueService: AdminRevenueService) {}

  /**
   * 获取收入统计数据
   * GET /admin/revenue/stats
   */
  @Get('stats')
  @AdminAudit('read', 'revenue_stats')
  async getStats(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const stats = await this.revenueService.getRevenueStats(filters);
    return { stats };
  }

  /**
   * 获取收入趋势数据
   * GET /admin/revenue/trend
   */
  @Get('trend')
  @AdminAudit('read', 'revenue_trend')
  async getTrend(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const trend = await this.revenueService.getRevenueTrend(filters);
    return { trend };
  }

  /**
   * 获取渠道分析数据
   * GET /admin/revenue/channels
   */
  @Get('channels')
  @AdminAudit('read', 'channel_analytics')
  async getChannels(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const channels = await this.revenueService.getChannelAnalytics(filters);
    return { channels };
  }

  /**
   * 获取促销效果分析
   * GET /admin/revenue/promotions
   */
  @Get('promotions')
  @AdminAudit('read', 'promotion_analytics')
  async getPromotions(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const promotions = await this.revenueService.getPromotionAnalytics(filters);
    return { promotions };
  }

  /**
   * 获取用户价值分布
   * GET /admin/revenue/user-value-distribution
   */
  @Get('user-value-distribution')
  @AdminAudit('read', 'user_value_distribution')
  async getUserValueDistribution(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const distribution = await this.revenueService.getUserValueDistribution();
    return { distribution };
  }

  /**
   * 获取订单状态分布
   * GET /admin/revenue/order-status-distribution
   */
  @Get('order-status-distribution')
  @AdminAudit('read', 'order_status_distribution')
  async getOrderStatusDistribution(
    @Query() filters: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const distribution = await this.revenueService.getOrderStatusDistribution(filters);
    return { distribution };
  }

  /**
   * 获取套餐销售排行
   * GET /admin/revenue/package-rankings
   */
  @Get('package-rankings')
  @AdminAudit('read', 'package_rankings')
  async getPackageRankings(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const rankings = await this.revenueService.getPackageRankings(filters);
    return { rankings };
  }

  /**
   * 保存收入指标
   * POST /admin/revenue/metrics
   */
  @Post('metrics')
  @AdminAudit('create', 'revenue_metrics')
  async saveMetrics(
    @Body() body: { dateKey: string; metrics: any },
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.revenueService.saveRevenueMetrics(body.dateKey, body.metrics);
    return { result };
  }

  /**
   * 保存渠道分析数据
   * POST /admin/revenue/channel-analytics
   */
  @Post('channel-analytics')
  @AdminAudit('create', 'channel_analytics')
  async saveChannelAnalytics(
    @Body() body: { dateKey: string; channel: string; packageId: string; data: any },
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.revenueService.saveChannelAnalytics(
      body.dateKey,
      body.channel,
      body.packageId,
      body.data
    );
    return { result };
  }

  /**
   * 保存促销效果分析数据
   * POST /admin/revenue/promotion-analytics
   */
  @Post('promotion-analytics')
  @AdminAudit('create', 'promotion_analytics')
  async savePromotionAnalytics(
    @Body() body: { promotionId: string; dateKey: string; data: any },
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.revenueService.savePromotionAnalytics(
      body.promotionId,
      body.dateKey,
      body.data
    );
    return { result };
  }
}
