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
            type: string;
            code: string;
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
            type: string;
            code: string;
            value: number;
            remainingUses: number;
            label: string;
        }[];
    }>;
}
