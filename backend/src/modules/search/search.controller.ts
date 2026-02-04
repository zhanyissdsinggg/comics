import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { SearchService } from "./search.service";
import { Request } from "express";
import { checkAdultGate, parseBool } from "../../common/utils/adult-gate";
import { Response } from "express";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { getUserIdFromRequest } from "../../common/utils/auth";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query("q") q: string,
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
    const results = await this.searchService.search(q || "", adult === true);
    return { results };
  }

  @Get("keywords")
  async keywords(
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
    const keywords = await this.searchService.keywords(adult === true);
    return { keywords };
  }

  @Get("suggest")
  async suggest(
    @Query("q") q: string,
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
    const suggestions = await this.searchService.suggest(q || "", adult === true);
    return { suggestions };
  }

  @Get("hot")
  async hot(
    @Query("adult") adultParam: string,
    @Query("window") windowParam: string,
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
    const keywords = await this.searchService.hot(adult === true, windowParam);
    return { keywords };
  }

  @Post("log")
  async log(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const query = body?.query;
    if (!query) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    await this.searchService.log(userId, query);
    return { ok: true };
  }
}
