import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { checkAdultGate, parseBool } from "../../common/utils/adult-gate";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query("q") q: string,
    @Query("type") type: string,
    @Query("status") status: string,
    @Query("genre") genre: string,
    @Query("sort") sort: string,
    @Query("page") page: string,
    @Query("pageSize") pageSize: string,
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

    return this.searchService.search({
      q,
      type,
      status,
      genre,
      sort,
      page,
      pageSize,
      adult: adult === true,
    });
  }

  @Get("keywords")
  async keywords(
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
    const keywords = await this.searchService.keywords(adult === true);
    return { keywords };
  }

  @Get("suggest")
  async suggest(
    @Query("q") q: string,
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
    const suggestions = await this.searchService.suggest(q || "", adult === true);
    return { suggestions };
  }

  @Get("hot")
  async hot(
    @Query("adult") adultParam: string,
    @Query("window") windowParam: string,
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
    const keywords = await this.searchService.hot(adult === true, windowParam);
    return { keywords };
  }

  @Post("log")
  async log(@Body() body: Record<string, any>, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
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