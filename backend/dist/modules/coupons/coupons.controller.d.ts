import { CouponsService } from "./coupons.service";
import { Request, Response } from "express";
export declare class CouponsController {
    private readonly couponsService;
    constructor(couponsService: CouponsService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        coupons: {
            claimedAt: Date;
            id: string;
            code: string;
            type: string;
            value: number;
            remainingUses: number;
            label: string;
        }[];
    }>;
    claim(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        coupons: {
            claimedAt: Date;
            id: string;
            code: string;
            type: string;
            value: number;
            remainingUses: number;
            label: string;
        }[];
    }>;
}
