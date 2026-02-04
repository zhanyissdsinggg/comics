import { EventsService } from "./events.service";
import { Request, Response } from "express";
export declare class EventsController {
    private readonly eventsService;
    constructor(eventsService: EventsService);
    list(eventName: string, limitParam: string, offsetParam: string, req: Request, res: Response): {
        error: string;
    } | {
        events: any;
        total: any;
        limit: number;
        offset: number;
        counts: {};
    };
    add(body: any, req: Request, res: Response): {
        error: string;
    } | {
        events: any;
    };
    export(eventName: string, req: Request, res: Response): void;
    clear(req: Request, res: Response): {
        error: string;
    } | {
        events: any[];
    };
}
