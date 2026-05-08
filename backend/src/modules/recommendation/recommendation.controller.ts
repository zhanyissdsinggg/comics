import { Controller, Get, Header, Param, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { parseBool, resolveAdultGateContext } from "../../common/utils/adult-gate";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { RecommendationService } from "./recommendation.service";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("recommendations")
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("homepage")
  @Header("Cache-Control", "public, max-age=60, s-maxage=60")
  async getHomepageSlots(
    @Query("adult") adultParam: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = await resolveAdultGateContext(this.prisma, req);
      if (!gate.ok) {
        res.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }

    const slots = await this.recommendationService.getHomepageSlots(adult === true);
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
    @Query("adult") adultParam?: string,
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = await resolveAdultGateContext(this.prisma, req || {});
      if (!gate.ok) {
        res?.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }

    const userId = (req ? getUserIdFromRequest(req, true) : null) || undefined;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const recommendations = await this.recommendationService.getContentBasedRecommendations(
      seriesId,
      limitNum,
      userId,
      adult === true,
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
    @Query("adult") adultParam?: string,
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = await resolveAdultGateContext(this.prisma, req || {});
      if (!gate.ok) {
        res?.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }

    const userId = (req ? getUserIdFromRequest(req, true) : null) || undefined;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const recommendations = userId
      ? await this.recommendationService.getPersonalizedRecommendations(userId, limitNum, adult === true)
      : await this.recommendationService.getPopularSeries(limitNum, adult === true);

    return {
      recommendations,
      count: recommendations.length,
      personalized: !!userId,
    };
  }

  @Get("popular")
  @Header("Cache-Control", "public, max-age=300, s-maxage=300")
  async getPopularSeries(
    @Query("limit") limit?: string,
    @Query("adult") adultParam?: string,
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = await resolveAdultGateContext(this.prisma, req || {});
      if (!gate.ok) {
        res?.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }

    const limitNum = limit ? parseInt(limit, 10) : 10;
    const series = await this.recommendationService.getPopularSeries(limitNum, adult === true);

    return {
      series,
      count: series.length,
    };
  }
}
