import { Controller, Get, Param, Query, Req, Res } from "@nestjs/common";
import { SeriesService } from "./series.service";
import { Request } from "express";
import { checkAdultGate, parseBool } from "../../common/utils/adult-gate";
import { Response } from "express";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { getSubscriptionPayload } from "../../common/utils/subscription";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("series")
export class SeriesController {
  constructor(
    private readonly seriesService: SeriesService,
    private readonly prisma: PrismaService
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
  async detail(@Param("id") id: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, true);
    const subscription = userId ? await getSubscriptionPayload(this.prisma, userId) : null;
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
  }
}
