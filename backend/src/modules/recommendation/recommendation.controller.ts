// 老王注释：AI智能推荐控制器
import { Controller, Get, Param, Query, Req, Header } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { Request } from 'express';
import { getUserIdFromRequest } from '../../common/utils/auth';

@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  /**
   * 老王注释：获取相似作品推荐
   * GET /api/recommendations/similar/:seriesId
   * 缓存10分钟 - 基于内容的推荐变化很少
   */
  @Get('similar/:seriesId')
  @Header('Cache-Control', 'public, max-age=600, s-maxage=600')
  async getSimilarSeries(
    @Param('seriesId') seriesId: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    const userId = (req ? getUserIdFromRequest(req, true) : null) || undefined;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const recommendations =
      await this.recommendationService.getContentBasedRecommendations(
        seriesId,
        limitNum,
        userId,
      );

    return {
      seriesId,
      recommendations,
      count: recommendations.length,
    };
  }

  /**
   * 老王注释：获取个性化推荐（基于用户阅读历史）
   * GET /api/recommendations/personalized
   * 缓存1分钟 - 个性化推荐需要较新的数据
   */
  @Get('personalized')
  @Header('Cache-Control', 'private, max-age=60, s-maxage=60')
  async getPersonalizedRecommendations(
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    const userId = (req ? getUserIdFromRequest(req, true) : null) || undefined;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    let recommendations;
    if (userId) {
      recommendations =
        await this.recommendationService.getPersonalizedRecommendations(
          userId,
          limitNum,
        );
    } else {
      // 老王注释：未登录用户返回热门作品
      recommendations =
        await this.recommendationService.getPopularSeries(limitNum);
    }

    return {
      recommendations,
      count: recommendations.length,
      personalized: !!userId,
    };
  }

  /**
   * 老王注释：获取热门作品
   * GET /api/recommendations/popular
   * 缓存5分钟 - 热门作品变化不频繁
   */
  @Get('popular')
  @Header('Cache-Control', 'public, max-age=300, s-maxage=300')
  async getPopularSeries(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const series = await this.recommendationService.getPopularSeries(limitNum);

    return {
      series,
      count: series.length,
    };
  }
}
