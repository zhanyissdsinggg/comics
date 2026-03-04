import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AdminRecommendationService } from '../admin-content/services/admin-recommendation.service';
import { AdminAudit } from '../decorators/admin-audit.decorator';
import { AdminAuthGuard } from "../guards/admin-auth.guard";

/**
 * 老王说：推荐和排行榜管理控制器
 * 这个SB控制器处理所有推荐位和排行榜相关的API端点
 */
@Controller('admin/recommendations')
@UseGuards(AdminAuthGuard)
export class AdminRecommendationController {
  constructor(private recommendationService: AdminRecommendationService) {}

  /**
   * 获取所有推荐位
   * GET /admin/recommendations/slots
   */
  @Get('slots')
  @AdminAudit('read', 'recommendation_slots')
  async getSlots(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.recommendationService.getRecommendationSlots(filters);
    return { slots: result.slots, total: result.total };
  }

  /**
   * 创建推荐位
   * POST /admin/recommendations/slots
   */
  @Post('slots')
  @AdminAudit('create', 'recommendation_slot')
  async createSlot(@Body() body: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const slot = await this.recommendationService.createRecommendationSlot(body);
    return { slot };
  }

  /**
   * 更新推荐位
   * PATCH /admin/recommendations/slots/:id
   */
  @Patch('slots/:id')
  @AdminAudit('update', 'recommendation_slot')
  async updateSlot(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const slot = await this.recommendationService.updateRecommendationSlot(id, body);
    return { slot };
  }

  /**
   * 删除推荐位
   * DELETE /admin/recommendations/slots/:id
   */
  @Delete('slots/:id')
  @AdminAudit('delete', 'recommendation_slot')
  async deleteSlot(@Param('id') id: string, @Req() req: any, @Res({ passthrough: true }) res: any) {
    await this.recommendationService.deleteRecommendationSlot(id);
    return { success: true };
  }

  /**
   * 获取所有排行榜配置
   * GET /admin/recommendations/rankings
   */
  @Get('rankings')
  @AdminAudit('read', 'ranking_configs')
  async getRankings(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.recommendationService.getRankingConfigs(filters);
    return { configs: result.configs, total: result.total };
  }

  /**
   * 创建排行榜配置
   * POST /admin/recommendations/rankings
   */
  @Post('rankings')
  @AdminAudit('create', 'ranking_config')
  async createRanking(@Body() body: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const config = await this.recommendationService.createRankingConfig(body);
    return { config };
  }

  /**
   * 更新排行榜配置
   * PATCH /admin/recommendations/rankings/:id
   */
  @Patch('rankings/:id')
  @AdminAudit('update', 'ranking_config')
  async updateRanking(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const config = await this.recommendationService.updateRankingConfig(id, body);
    return { config };
  }

  /**
   * 删除排行榜配置
   * DELETE /admin/recommendations/rankings/:id
   */
  @Delete('rankings/:id')
  @AdminAudit('delete', 'ranking_config')
  async deleteRanking(@Param('id') id: string, @Req() req: any, @Res({ passthrough: true }) res: any) {
    await this.recommendationService.deleteRankingConfig(id);
    return { success: true };
  }

  /**
   * 获取推荐效果分析
   * GET /admin/recommendations/analytics
   */
  @Get('analytics')
  @AdminAudit('read', 'recommendation_analytics')
  async getAnalytics(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const result = await this.recommendationService.getRecommendationAnalytics(filters);
    return { analytics: result.analytics, total: result.total };
  }

  /**
   * 保存推荐效果分析数据
   * POST /admin/recommendations/analytics
   */
  @Post('analytics')
  @AdminAudit('create', 'recommendation_analytics')
  async saveAnalytics(
    @Body() body: { slotId: string; seriesId: string; dateKey: string; data: any },
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.recommendationService.saveRecommendationAnalytics(
      body.slotId,
      body.seriesId,
      new Date(body.dateKey),
      body.data
    );
    return { result };
  }

  /**
   * 获取推荐位的效果统计
   * GET /admin/recommendations/slots/:id/performance
   */
  @Get('slots/:id/performance')
  @AdminAudit('read', 'slot_performance')
  async getSlotPerformance(
    @Param('id') id: string,
    @Query() filters: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const performance = await this.recommendationService.getSlotPerformance(id, filters);
    return { performance };
  }

  /**
   * 获取排行榜的效果统计
   * GET /admin/recommendations/rankings/:type/performance
   */
  @Get('rankings/:type/performance')
  @AdminAudit('read', 'ranking_performance')
  async getRankingPerformance(
    @Param('type') type: string,
    @Query() filters: any,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const performance = await this.recommendationService.getRankingPerformance(type, filters);
    return { performance };
  }

  /**
   * 获取热门作品
   * GET /admin/recommendations/popular
   */
  @Get('popular')
  @AdminAudit('read', 'popular_series')
  async getPopularSeries(@Query() filters: any, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const series = await this.recommendationService.getPopularSeries(filters);
    return { series };
  }
}
