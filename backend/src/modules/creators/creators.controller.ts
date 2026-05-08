import { Controller, Get, NotFoundException, Param, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { parseBool, resolveAdultGateContext } from "../../common/utils/adult-gate";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { CreatorsService } from "./creators.service";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("creators")
export class CreatorsController {
  constructor(
    private readonly creatorsService: CreatorsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(
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

    const creators = await this.creatorsService.listPublicCreators(adult === true);
    return {
      creators,
      count: creators.length,
    };
  }

  @Get(":slug")
  async detail(
    @Param("slug") slug: string,
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

    const creator = await this.creatorsService.getPublicCreator(slug, adult === true);
    if (!creator) {
      throw new NotFoundException("Creator not found.");
    }

    return {
      creator,
    };
  }
}
