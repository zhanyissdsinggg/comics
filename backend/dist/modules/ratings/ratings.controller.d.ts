import { RatingsService } from "./ratings.service";
import { Request, Response } from "express";
export declare class RatingsController {
    private readonly ratingsService;
    constructor(ratingsService: RatingsService);
    setRating(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        rating: number;
        count: number;
    }>;
}
