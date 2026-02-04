import { Controller, Get, Query, Req, Res } from "@nestjs/common";
import { RankingsService } from "./rankings.service";
import { Request } from "express";
import { checkAdultGate, parseBool } from "../../common/utils/adult-gate";
import { Response } from "express";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("rankings")
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get()
  async list(
    @Query("type") type: string,
    @Query("adult") adultParam: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const adult = parseBool(adultParam);
    if (adult === true) {
      const gate = checkAdultGate(req.cookies || {});
      if (!gate.ok) {
        res.status(403);
        return buildError(ERROR_CODES.ADULT_GATED, { reason: gate.reason });
      }
    }
    const rankings = await this.rankingsService.list(type || "popular", adult === true);
    return { rankings };
  }
}
