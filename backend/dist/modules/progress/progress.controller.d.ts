import { ProgressService } from "./progress.service";
import { Request, Response } from "express";
export declare class ProgressController {
    private readonly progressService;
    constructor(progressService: ProgressService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        progress: Record<string, any>;
    }>;
    update(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        progress: Record<string, any>;
    }>;
}
