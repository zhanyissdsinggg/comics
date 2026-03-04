import { Controller, Get, Post, Patch, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminAnalyticsService } from '../admin-analytics/services/admin-analytics.service';
import { AdminAudit } from '../decorators/admin-audit.decorator';
import { AdminAuthGuard } from "../guards/admin-auth.guard";

/**
 * 老王说：用户价值分析控制器
 * 这个SB控制器处理所有用户分析相关的API端点
 */
@Controller('admin/analytics')
@UseGuards(AdminAuthGuard)
export class AdminAnalyticsController {
  constructor(private analyticsService: AdminAnalyticsService) {}

  /**
   * 获取分析统计数据
   * GET /admin/analytics/stats
   */
  @Get('stats')
  @AdminAudit('read', 'analytics')
  async getStats(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const stats = await this.analyticsService.getAnalyticsStats();
    return { stats };
  }

  /**
   * 获取用户分析数据
   * GET /admin/analytics/users/:userId
   */
  @Get('users/:userId')
  @AdminAudit('read', 'user_analytics')
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const analytics = await this.analyticsService.getUserAnalytics(userId);
    if (!analytics) {
      return { error: 'User not found' };
    }
    return { analytics };
  }

  /**
   * 获取用户分层列表
   * GET /admin/analytics/segments?segment=vip&limit=100&offset=0
   */
  @Get('segments')
  @AdminAudit('read', 'user_segments')
  async getUserSegments(
    @Query() filters: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const segments = await this.analyticsService.getUserSegments(filters);
    return { segments };
  }

  /**
   * 获取用户行为分析
   * GET /admin/analytics/behavior/:userId
   */
  @Get('behavior/:userId')
  @AdminAudit('read', 'user_behavior')
  async getUserBehavior(
    @Param('userId') userId: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const behavior = await this.analyticsService.getUserBehaviorAnalytics(userId);
    if (!behavior) {
      return { error: 'User behavior not found' };
    }
    return { behavior };
  }

  /**
   * 更新用户标签
   * PATCH /admin/analytics/users/:userId/tags
   */
  @Patch('users/:userId/tags')
  @AdminAudit('update', 'user_tags')
  async updateUserTags(
    @Param('userId') userId: string,
    @Body() body: { tags: Array<{ tagType: string; tagValue: string }> },
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const tags = await this.analyticsService.updateUserTags(userId, body.tags);
    return { tags };
  }

  /**
   * 更新用户指标
   * PATCH /admin/analytics/users/:userId/metrics
   */
  @Patch('users/:userId/metrics')
  @AdminAudit('update', 'user_metrics')
  async updateUserMetrics(
    @Param('userId') userId: string,
    @Body() body: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const metrics = await this.analyticsService.updateUserMetrics(userId, body);
    return { metrics };
  }

  /**
   * 计算用户LTV
   * POST /admin/analytics/users/:userId/calculate-ltv
   */
  @Post('users/:userId/calculate-ltv')
  @AdminAudit('calculate', 'user_ltv')
  async calculateLTV(
    @Param('userId') userId: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const ltv = await this.analyticsService.calculateUserLTV(userId);
    return { ltv };
  }

  /**
   * 评估用户流失风险
   * POST /admin/analytics/users/:userId/assess-churn
   */
  @Post('users/:userId/assess-churn')
  @AdminAudit('assess', 'churn_risk')
  async assessChurn(
    @Param('userId') userId: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const churnRisk = await this.analyticsService.assessChurnRisk(userId);
    return { churnRisk };
  }
}
