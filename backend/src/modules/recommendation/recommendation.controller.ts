import { Controller, Get, Header, Param, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { checkAdultGate, parseBool } from "../../common/utils/adult-gate";
import { RecommendationService } from "./recommendation.service";

@Controller("recommendations")
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get("homepage")
  @Header("Cache-Control", "public, max-age=60, s-maxage=60")
  async getHomepageSlots(
    @Query("adult") adultParam: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = checkAdultGate(req.cookies || {});
      if (!gate.ok) {
        res.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }

    const slots = await this.recommendationService.getHomepageSlots();
    return {
      slots,
      count: slots.length,
    };
  }

  @Get("similar/:seriesId")
  @Header("Cache-Control", "public, max-age=600, s-maxage=600")
  async getSimilarSeries(
    @Param("seriesId") seriesId: string,
    @Query("limit") limit?: string,
    @Req() req?: Request,
  ) {
    const userId = (req ? getUserIdFromRequest(req, true) : null) || undefined;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const recommendations = await this.recommendationService.getContentBasedRecommendations(
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

  @Get("personalized")
  @Header("Cache-Control", "private, max-age=60, s-maxage=60")
  async getPersonalizedRecommendations(
    @Query("limit") limit?: string,
    @Req() req?: Request,
  ) {
    const userId = (req ? getUserIdFromRequest(req, true) : null) || undefined;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const recommendations = userId
      ? await this.recommendationService.getPersonalizedRecommendations(userId, limitNum)
      : await this.recommendationService.getPopularSeries(limitNum);

    return {
      recommendations,
      count: recommendations.length,
      personalized: !!userId,
    };
  }

  @Get("popular")
  @Header("Cache-Control", "public, max-age=300, s-maxage=300")
  async getPopularSeries(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const series = await this.recommendationService.getPopularSeries(limitNum);

    return {
      series,
      count: series.length,
    };
  }
}
