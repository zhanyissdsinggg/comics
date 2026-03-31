import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type {
  AnalyticsSegmentsFilters,
  UpdateUserMetricsInput,
  UpdateUserTagsBody,
} from '../admin-analytics/dtos/admin-analytics.dto';
import { AdminAnalyticsService } from '../admin-analytics/services/admin-analytics.service';
import { AdminAudit } from '../decorators/admin-audit.decorator';
import { RequireAdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminPermission } from '../permissions/admin-permissions';

@Controller('admin/analytics')
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.ANALYTICS_READ)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AdminAnalyticsService) {}

  @Get('stats')
  @AdminAudit('read', 'analytics')
  async getStats() {
    const stats = await this.analyticsService.getAnalyticsStats();
    return { stats };
  }

  @Get('users/:userId')
  @AdminAudit('read', 'user_analytics')
  async getUserAnalytics(@Param('userId') userId: string) {
    const analytics = await this.analyticsService.getUserAnalytics(userId);
    if (!analytics) {
      throw new NotFoundException('User not found');
    }
    return { analytics };
  }

  @Get('segments')
  @AdminAudit('read', 'user_segments')
  async getUserSegments(@Query() filters: AnalyticsSegmentsFilters) {
    const segments = await this.analyticsService.getUserSegments(filters);
    return { segments };
  }

  @Get('behavior/:userId')
  @AdminAudit('read', 'user_behavior')
  async getUserBehavior(@Param('userId') userId: string) {
    const behavior = await this.analyticsService.getUserBehaviorAnalytics(userId);
    if (!behavior) {
      throw new NotFoundException('User behavior not found');
    }
    return { behavior };
  }

  @Patch('users/:userId/tags')
  @AdminAudit('update', 'user_tags')
  @RequireAdminPermissions(AdminPermission.USER_UPDATE)
  async updateUserTags(@Param('userId') userId: string, @Body() body: UpdateUserTagsBody) {
    const tags = await this.analyticsService.updateUserTags(userId, body.tags);
    return { tags };
  }

  @Patch('users/:userId/metrics')
  @AdminAudit('update', 'user_metrics')
  @RequireAdminPermissions(AdminPermission.USER_UPDATE)
  async updateUserMetrics(@Param('userId') userId: string, @Body() body: UpdateUserMetricsInput) {
    const metrics = await this.analyticsService.updateUserMetrics(userId, body);
    return { metrics };
  }

  @Post('users/:userId/calculate-ltv')
  @AdminAudit('calculate', 'user_ltv')
  @RequireAdminPermissions(AdminPermission.USER_UPDATE)
  async calculateLTV(@Param('userId') userId: string) {
    const ltv = await this.analyticsService.calculateUserLTV(userId);
    return { ltv };
  }

  @Post('users/:userId/assess-churn')
  @AdminAudit('assess', 'churn_risk')
  @RequireAdminPermissions(AdminPermission.USER_UPDATE)
  async assessChurn(@Param('userId') userId: string) {
    const churnRisk = await this.analyticsService.assessChurnRisk(userId);
    return { churnRisk };
  }
}
