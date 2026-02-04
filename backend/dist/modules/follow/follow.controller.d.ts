import { FollowService } from "./follow.service";
import { Request, Response } from "express";
export declare class FollowController {
    private readonly followService;
    constructor(followService: FollowService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        followedSeriesIds: string[];
    }>;
    update(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        followedSeriesIds: string[];
    }>;
}
