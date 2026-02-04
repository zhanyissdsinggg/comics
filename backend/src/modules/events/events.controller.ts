import { Body, Controller, Delete, Get, Post, Query, Req, Res } from "@nestjs/common";
import { EventsService } from "./events.service";
import { Request, Response } from "express";
import { getUserIdFromRequest } from "../../common/utils/auth";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list(
    @Query("event") eventName: string,
    @Query("limit") limitParam: string,
    @Query("offset") offsetParam: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    const events = this.eventsService.list(userId);
    const filtered = eventName
      ? events.filter((item) => String(item.event || "") === String(eventName))
      : events;
    const limit = Math.max(1, Math.min(100, Number(limitParam || 50)));
    const offset = Math.max(0, Number(offsetParam || 0));
    const sliced = filtered.slice(offset, offset + limit);
    const counts = {};
    filtered.forEach((item) => {
      const key = String(item.event || "unknown");
      counts[key] = (counts[key] || 0) + 1;
    });
    return { events: sliced, total: filtered.length, limit, offset, counts };
  }

  @Post()
  add(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    if (!body?.event) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
    }
    const next = this.eventsService.add(userId, {
      event: body.event,
      props: body.props || {},
      ts: body.ts || Date.now(),
    });
    return { events: next };
  }

  @Get("export")
  export(@Query("event") eventName: string, @Req() req: Request, @Res() res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401).json(buildError(ERROR_CODES.UNAUTHENTICATED));
      return;
    }
    const events = this.eventsService.list(userId);
    const filtered = eventName
      ? events.filter((item) => String(item.event || "") === String(eventName))
      : events;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=event-log.json");
    res.status(200).send(JSON.stringify(filtered, null, 2));
  }

  @Delete()
  clear(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = getUserIdFromRequest(req, false);
    if (!userId) {
      res.status(401);
      return buildError(ERROR_CODES.UNAUTHENTICATED);
    }
    return { events: this.eventsService.clear(userId) };
  }
}
