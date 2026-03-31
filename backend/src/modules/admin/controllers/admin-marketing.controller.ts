import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  AddMarketingTargetUsersDto,
  CreateMarketingCampaignDto,
  MarketingAnalyticsFiltersDto,
  MarketingCampaignFiltersDto,
  MarketingStatsFiltersDto,
  MarketingTargetFiltersDto,
  SaveMarketingAnalyticsBodyDto,
  UpdateMarketingBudgetDto,
  UpdateMarketingCampaignDto,
  UpdateMarketingTargetStatusDto,
} from '../admin-system/dtos/admin-marketing.dto';
import { AdminMarketingService } from '../admin-system/services/admin-marketing.service';
import { AdminAudit } from '../decorators/admin-audit.decorator';
import { RequireAdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminPermission } from '../permissions/admin-permissions';

@Controller('admin/marketing')
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.MARKETING_READ)
export class AdminMarketingController {
  constructor(private readonly marketingService: AdminMarketingService) {}

  @Get('campaigns')
  @AdminAudit('read', 'marketing_campaigns')
  async getCampaigns(@Query() filters: MarketingCampaignFiltersDto) {
    const result = await this.marketingService.getCampaigns(filters);
    return { campaigns: result.campaigns, total: result.total };
  }

  @Post('campaigns')
  @AdminAudit('create', 'marketing_campaign')
  @RequireAdminPermissions(AdminPermission.MARKETING_UPDATE)
  async createCampaign(@Body() body: CreateMarketingCampaignDto) {
    const campaign = await this.marketingService.createCampaign(body);
    return { campaign };
  }

  @Get('campaigns/:id')
  @AdminAudit('read', 'marketing_campaign')
  async getCampaignDetail(@Param('id') id: string) {
    return this.marketingService.getCampaignDetail(id);
  }

  @Patch('campaigns/:id')
  @AdminAudit('update', 'marketing_campaign')
  @RequireAdminPermissions(AdminPermission.MARKETING_UPDATE)
  async updateCampaign(@Param('id') id: string, @Body() body: UpdateMarketingCampaignDto) {
    const campaign = await this.marketingService.updateCampaign(id, body);
    return { campaign };
  }

  @Delete('campaigns/:id')
  @AdminAudit('delete', 'marketing_campaign')
  @RequireAdminPermissions(AdminPermission.MARKETING_UPDATE)
  async deleteCampaign(@Param('id') id: string) {
    await this.marketingService.deleteCampaign(id);
    return { success: true };
  }

  @Get('campaigns/:id/analytics')
  @AdminAudit('read', 'marketing_analytics')
  async getCampaignAnalytics(@Param('id') id: string, @Query() filters: MarketingAnalyticsFiltersDto) {
    return this.marketingService.getCampaignAnalytics(id, filters);
  }

  @Post('campaigns/:id/analytics')
  @AdminAudit('create', 'marketing_analytics')
  @RequireAdminPermissions(AdminPermission.MARKETING_UPDATE)
  async saveMarketingAnalytics(@Param('id') id: string, @Body() body: SaveMarketingAnalyticsBodyDto) {
    const result = await this.marketingService.saveMarketingAnalytics(id, body.dateKey, body.data);
    return { result };
  }

  @Get('campaigns/:id/targets')
  @AdminAudit('read', 'marketing_targets')
  async getTargetUsers(@Param('id') id: string, @Query() filters: MarketingTargetFiltersDto) {
    return this.marketingService.getTargetUsers(id, filters);
  }

  @Post('campaigns/:id/targets')
  @AdminAudit('create', 'marketing_targets')
  @RequireAdminPermissions(AdminPermission.MARKETING_UPDATE)
  async addTargetUsers(@Param('id') id: string, @Body() body: AddMarketingTargetUsersDto) {
    const result = await this.marketingService.addTargetUsers(id, body.userIds);
    return { result };
  }

  @Patch('campaigns/:campaignId/targets/:userId')
  @AdminAudit('update', 'marketing_target')
  @RequireAdminPermissions(AdminPermission.MARKETING_UPDATE)
  async updateTargetUserStatus(
    @Param('campaignId') campaignId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateMarketingTargetStatusDto,
  ) {
    const result = await this.marketingService.updateTargetUserStatus(campaignId, userId, body);
    return { result };
  }

  @Get('campaigns/:id/budget')
  @AdminAudit('read', 'marketing_budget')
  async getCampaignBudget(@Param('id') id: string) {
    const budget = await this.marketingService.getCampaignBudget(id);
    return { budget };
  }

  @Patch('campaigns/:id/budget')
  @AdminAudit('update', 'marketing_budget')
  @RequireAdminPermissions(AdminPermission.MARKETING_UPDATE)
  async updateCampaignBudget(@Param('id') id: string, @Body() body: UpdateMarketingBudgetDto) {
    const budget = await this.marketingService.updateCampaignBudget(id, body);
    return { budget };
  }

  @Get('stats')
  @AdminAudit('read', 'marketing_stats')
  async getMarketingStats(@Query() filters: MarketingStatsFiltersDto) {
    const stats = await this.marketingService.getMarketingStats(filters);
    return { stats };
  }

  @Get('stats/by-segment')
  @AdminAudit('read', 'marketing_stats')
  async getCampaignsBySegment(@Query() filters: MarketingStatsFiltersDto) {
    const segments = await this.marketingService.getCampaignsBySegment(filters);
    return { segments };
  }

  @Get('stats/by-type')
  @AdminAudit('read', 'marketing_stats')
  async getCampaignsByType(@Query() filters: MarketingStatsFiltersDto) {
    const types = await this.marketingService.getCampaignsByType(filters);
    return { types };
  }
}
