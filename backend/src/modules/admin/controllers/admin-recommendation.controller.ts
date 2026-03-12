import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  CreateRankingConfigDto,
  CreateRecommendationSlotDto,
  PopularSeriesFiltersDto,
  RecommendationAnalyticsFiltersDto,
  RecommendationPaginationFiltersDto,
  RecommendationPerformanceFiltersDto,
  SaveRecommendationAnalyticsBodyDto,
  UpdateRankingConfigDto,
  UpdateRecommendationSlotDto,
} from '../admin-content/dtos/admin-recommendation.dto';
import { AdminRecommendationService } from '../admin-content/services/admin-recommendation.service';
import { AdminAudit } from '../decorators/admin-audit.decorator';
import { AdminAuthGuard } from '../guards/admin-auth.guard';

@Controller('admin/recommendations')
@UseGuards(AdminAuthGuard)
export class AdminRecommendationController {
  constructor(private readonly recommendationService: AdminRecommendationService) {}

  @Get('slots')
  @AdminAudit('read', 'recommendation_slots')
  async getSlots(@Query() filters: RecommendationPaginationFiltersDto) {
    const result = await this.recommendationService.getRecommendationSlots(filters);
    return { slots: result.slots, total: result.total };
  }

  @Post('slots')
  @AdminAudit('create', 'recommendation_slot')
  async createSlot(@Body() body: CreateRecommendationSlotDto) {
    const slot = await this.recommendationService.createRecommendationSlot(body);
    return { slot };
  }

  @Patch('slots/:id')
  @AdminAudit('update', 'recommendation_slot')
  async updateSlot(@Param('id') id: string, @Body() body: UpdateRecommendationSlotDto) {
    const slot = await this.recommendationService.updateRecommendationSlot(id, body);
    return { slot };
  }

  @Delete('slots/:id')
  @AdminAudit('delete', 'recommendation_slot')
  async deleteSlot(@Param('id') id: string) {
    await this.recommendationService.deleteRecommendationSlot(id);
    return { success: true };
  }

  @Get('rankings')
  @AdminAudit('read', 'ranking_configs')
  async getRankings(@Query() filters: RecommendationPaginationFiltersDto) {
    const result = await this.recommendationService.getRankingConfigs(filters);
    return { configs: result.configs, total: result.total };
  }

  @Post('rankings')
  @AdminAudit('create', 'ranking_config')
  async createRanking(@Body() body: CreateRankingConfigDto) {
    const config = await this.recommendationService.createRankingConfig(body);
    return { config };
  }

  @Patch('rankings/:id')
  @AdminAudit('update', 'ranking_config')
  async updateRanking(@Param('id') id: string, @Body() body: UpdateRankingConfigDto) {
    const config = await this.recommendationService.updateRankingConfig(id, body);
    return { config };
  }

  @Delete('rankings/:id')
  @AdminAudit('delete', 'ranking_config')
  async deleteRanking(@Param('id') id: string) {
    await this.recommendationService.deleteRankingConfig(id);
    return { success: true };
  }

  @Get('analytics')
  @AdminAudit('read', 'recommendation_analytics')
  async getAnalytics(@Query() filters: RecommendationAnalyticsFiltersDto) {
    const result = await this.recommendationService.getRecommendationAnalytics(filters);
    return { analytics: result.analytics, total: result.total };
  }

  @Post('analytics')
  @AdminAudit('create', 'recommendation_analytics')
  async saveAnalytics(@Body() body: SaveRecommendationAnalyticsBodyDto) {
    const result = await this.recommendationService.saveRecommendationAnalytics(
      body.slotId,
      body.seriesId,
      new Date(body.dateKey),
      body.data,
    );
    return { result };
  }

  @Get('slots/:id/performance')
  @AdminAudit('read', 'slot_performance')
  async getSlotPerformance(@Param('id') id: string, @Query() filters: RecommendationPerformanceFiltersDto) {
    const performance = await this.recommendationService.getSlotPerformance(id, filters);
    return { performance };
  }

  @Get('rankings/:type/performance')
  @AdminAudit('read', 'ranking_performance')
  async getRankingPerformance(
    @Param('type') type: string,
    @Query() filters: RecommendationPerformanceFiltersDto,
  ) {
    const performance = await this.recommendationService.getRankingPerformance(type, filters);
    return { performance };
  }

  @Get('popular')
  @AdminAudit('read', 'popular_series')
  async getPopularSeries(@Query() filters: PopularSeriesFiltersDto) {
    const series = await this.recommendationService.getPopularSeries(filters);
    return { series };
  }
}
