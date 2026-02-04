import { OrdersService } from "./orders.service";
import { Request, Response } from "express";
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    list(req: Request, res: Response): Promise<{
        error: string;
    } | {
        orders: any[];
    }>;
    reconcile(req: Request, res: Response): Promise<{
        error: string;
    } | {
        updated: number;
        orders: any[];
    }>;
}
