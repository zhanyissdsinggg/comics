import { Controller, Get, Logger, Param, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { PrismaService } from "../../common/prisma/prisma.service";
import { checkAdultGate, parseBool } from "../../common/utils/adult-gate";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { getSubscriptionPayload } from "../../common/utils/subscription";
import { SeriesService } from "./series.service";

@Controller("series")
export class SeriesController {
  private readonly logger = new Logger(SeriesController.name);

  constructor(
    private readonly seriesService: SeriesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@Query("adult") adultParam: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = checkAdultGate(req.cookies || {});
      if (!gate.ok) {
        res.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }

    return { series: await this.seriesService.list(adult) };
  }

  @Get(":id")
  async detail(
    @Param("id") id: string,
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

    try {
      const userId = getUserIdFromRequest(req, false);
      let subscription = null;
      if (userId) {
        subscription = await getSubscriptionPayload(this.prisma, userId).catch(() => null);
      }

      const result = await this.seriesService.detail(id, subscription);
      if (!result) {
        res.status(404);
        return buildError(ERROR_CODES.NOT_FOUND);
      }

      if (result.series.adult) {
        const gate = checkAdultGate(req.cookies || {});
        if (!gate.ok) {
          res.status(403);
          return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
        }
      }

      return result;
    } catch (error) {
      const stack = error instanceof Error ? error.stack || error.message : String(error);
      this.logger.error(`Failed to load series detail for ${id}.`, stack);
      res.status(503);
      return buildError(ERROR_CODES.INTERNAL, { message: "Failed to load series detail." });
    }
  }
}
