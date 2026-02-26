import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { EntitlementsService } from "./entitlements.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";
import { checkRateLimit, getIdempotencyRecord, setIdempotencyRecord } from "../../common/storage/limits";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("entitlements")
export class EntitlementsController {
  constructor(
    private readonly entitlementsService: EntitlementsService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async getEntitlement(
    @Query("seriesId") seriesId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    if (!seriesId) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const entitlement = await this.entitlementsService.getEntitlement(userId, seriesId);
    return { entitlement };
  }

  @Post()
  async unlock(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const idempotencyKey = body?.idempotencyKey || req.headers["idempotency-key"];
    if (idempotencyKey) {
      const cached = await getIdempotencyRecord(this.prisma, userId, String(idempotencyKey));
      if (cached) {
        res.status(cached.status || 200);
        return cached.body;
      }
    }
    const rate = await checkRateLimit(this.prisma, userId, "unlock", 30, 60);
    if (!rate.ok) {
      res.status(429);
      const body = buildError(ERROR_CODES.RATE_LIMITED, { retryAfterSec: rate.retryAfterSec });
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 429,
          body,
        });
      }
      return body;
    }
    const seriesId = body?.seriesId;
    const episodeId = body?.episodeId;
    const method = body?.method || "WALLET";
    const offerId = body?.offerId || "";
    const episodeIds = Array.isArray(body?.episodeIds) ? body.episodeIds : [];

    if (!seriesId || (!episodeId && method !== "PACK")) {
      res.status(400);
      const responseBody = buildError(ERROR_CODES.INVALID_REQUEST);
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 400,
          body: responseBody,
        });
      }
      return responseBody;
    }

    if (method === "TTF") {
      const result = await this.entitlementsService.unlockWithTtf(userId, seriesId, episodeId);
      if (!result.ok) {
        res.status(result.status || 400);
        const shortfallPts = "shortfallPts" in result ? result.shortfallPts : undefined;
        const responseBody = buildError(result.error || ERROR_CODES.INTERNAL, { shortfallPts });
        if (idempotencyKey) {
          await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
            status: result.status || 400,
            body: responseBody,
          });
        }
        return responseBody;
      }
      const responseBody = { ok: true, entitlement: result.entitlement, wallet: result.wallet };
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 200,
          body: responseBody,
        });
      }
      return responseBody;
    }

    if (method === "PACK") {
      const result = await this.entitlementsService.unlockPack(userId, seriesId, episodeIds, offerId);
      if (!result.ok) {
        res.status(result.status || 400);
        const shortfallPts = "shortfallPts" in result ? result.shortfallPts : undefined;
        const responseBody = buildError(result.error || ERROR_CODES.INTERNAL, { shortfallPts });
        if (idempotencyKey) {
          await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
            status: result.status || 400,
            body: responseBody,
          });
        }
        return responseBody;
      }
      const responseBody = { ok: true, entitlement: result.entitlement, wallet: result.wallet };
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: 200,
          body: responseBody,
        });
      }
      return responseBody;
    }

    const result = await this.entitlementsService.unlockWithWallet(userId, seriesId, episodeId);
    if (!result.ok) {
      res.status(result.status || 400);
      const shortfallPts = "shortfallPts" in result ? result.shortfallPts : undefined;
      const responseBody = buildError(result.error || ERROR_CODES.INTERNAL, { shortfallPts });
      if (idempotencyKey) {
        await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
          status: result.status || 400,
          body: responseBody,
        });
      }
      return responseBody;
    }
    const responseBody = { ok: true, entitlement: result.entitlement, wallet: result.wallet };
    if (idempotencyKey) {
      await setIdempotencyRecord(this.prisma, userId, String(idempotencyKey), {
        status: 200,
        body: responseBody,
      });
    }
    return responseBody;
  }
}
