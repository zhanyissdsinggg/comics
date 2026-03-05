import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminMarketingService } from '../admin-system/services/admin-marketing.service';
import { AdminAudit } from '../decorators/admin-audit.decorator';
import { AdminAuthGuard } from "../guards/admin-auth.guard";

/**
 * 老王说：营销活动管理控制器
 * 这个SB控制器处理所有营销活动相关的API端点
 */
@Controller('admin/marketing')
@UseGuards(AdminAuthGuard)
export class AdminMarketingController {
  constructor(private marketingService: AdminMarketingService) {}

  /**
   * 获取所有营销活动
   * GET /admin/marketing/campaigns
   */
  @Get('campaigns')
  @AdminAudit('read', 'marketing_campaigns')
  async getCampaigns(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.marketingService.getCampaigns(filters);
    return { campaigns: result.campaigns, total: result.total };
  }

  /**
   * 创建营销活动
   * POST /admin/marketing/campaigns
   */
  @Post('campaigns')
  @AdminAudit('create', 'marketing_campaign')
  async createCampaign(@Body() body: Record<string, any>, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const campaign = await this.marketingService.createCampaign(body);
    return { campaign };
  }

  /**
   * 获取营销活动详情
   * GET /admin/marketing/campaigns/:id
   */
  @Get('campaigns/:id')
  @AdminAudit('read', 'marketing_campaign')
  async getCampaignDetail(@Param('id') id: string, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.marketingService.getCampaignDetail(id);
    return result;
  }

  /**
   * 更新营销活动
   * PATCH /admin/marketing/campaigns/:id
   */
  @Patch('campaigns/:id')
  @AdminAudit('update', 'marketing_campaign')
  async updateCampaign(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const campaign = await this.marketingService.updateCampaign(id, body);
    return { campaign };
  }

  /**
   * 删除营销活动
   * DELETE /admin/marketing/campaigns/:id
   */
  @Delete('campaigns/:id')
  @AdminAudit('delete', 'marketing_campaign')
  async deleteCampaign(@Param('id') id: string, @Req() req: any, @Res({ passthrough: true }) res: any) {
    await this.marketingService.deleteCampaign(id);
    return { success: true };
  }

  /**
   * 获取营销活动效果分析
   * GET /admin/marketing/campaigns/:id/analytics
   */
  @Get('campaigns/:id/analytics')
  @AdminAudit('read', 'marketing_analytics')
  async getCampaignAnalytics(
    @Param('id') id: string,
    @Query() filters: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.marketingService.getCampaignAnalytics(id, filters);
    return result;
  }

  /**
   * 保存营销活动效果数据
   * POST /admin/marketing/campaigns/:id/analytics
   */
  @Post('campaigns/:id/analytics')
  @AdminAudit('create', 'marketing_analytics')
  async saveMarketingAnalytics(
    @Param('id') id: string,
    @Body() body: { dateKey: string; data: any },
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.marketingService.saveMarketingAnalytics(id, body.dateKey, body.data);
    return { result };
  }

  /**
   * 获取活动目标用户
   * GET /admin/marketing/campaigns/:id/targets
   */
  @Get('campaigns/:id/targets')
  @AdminAudit('read', 'marketing_targets')
  async getTargetUsers(
    @Param('id') id: string,
    @Query() filters: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.marketingService.getTargetUsers(id, filters);
    return result;
  }

  /**
   * 添加目标用户到活动
   * POST /admin/marketing/campaigns/:id/targets
   */
  @Post('campaigns/:id/targets')
  @AdminAudit('create', 'marketing_targets')
  async addTargetUsers(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.marketingService.addTargetUsers(id, body.userIds);
    return { result };
  }

  /**
   * 更新目标用户状态
   * PATCH /admin/marketing/campaigns/:campaignId/targets/:userId
   */
  @Patch('campaigns/:campaignId/targets/:userId')
  @AdminAudit('update', 'marketing_target')
  async updateTargetUserStatus(
    @Param('campaignId') campaignId: string,
    @Param('userId') userId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.marketingService.updateTargetUserStatus(campaignId, userId, body);
    return { result };
  }

  /**
   * 获取营销活动预算
   * GET /admin/marketing/campaigns/:id/budget
   */
  @Get('campaigns/:id/budget')
  @AdminAudit('read', 'marketing_budget')
  async getCampaignBudget(@Param('id') id: string, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const budget = await this.marketingService.getCampaignBudget(id);
    return { budget };
  }

  /**
   * 更新营销活动预算
   * PATCH /admin/marketing/campaigns/:id/budget
   */
  @Patch('campaigns/:id/budget')
  @AdminAudit('update', 'marketing_budget')
  async updateCampaignBudget(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const budget = await this.marketingService.updateCampaignBudget(id, body);
    return { budget };
  }

  /**
   * 获取营销活动统计
   * GET /admin/marketing/stats
   */
  @Get('stats')
  @AdminAudit('read', 'marketing_stats')
  async getMarketingStats(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const stats = await this.marketingService.getMarketingStats(filters);
    return { stats };
  }

  /**
   * 获取按目标受众分组的活动统计
   * GET /admin/marketing/stats/by-segment
   */
  @Get('stats/by-segment')
  @AdminAudit('read', 'marketing_stats')
  async getCampaignsBySegment(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const segments = await this.marketingService.getCampaignsBySegment(filters);
    return { segments };
  }

  /**
   * 获取按活动类型分组的活动统计
   * GET /admin/marketing/stats/by-type
   */
  @Get('stats/by-type')
  @AdminAudit('read', 'marketing_stats')
  async getCampaignsByType(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const types = await this.marketingService.getCampaignsByType(filters);
    return { types };
  }
}
