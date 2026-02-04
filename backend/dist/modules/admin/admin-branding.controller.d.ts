import { Request, Response } from "express";
export declare class AdminBrandingController {
    getConfig(req: Request, res: Response): Promise<{
        error: string;
    } | {
        branding: {
            siteLogoUrl: string;
            faviconUrl: string;
            homeBannerUrl: string;
            updatedAt: string | null;
        };
    }>;
    save(body: any, req: Request, res: Response): Promise<{
        error: string;
    } | {
        branding: {
            siteLogoUrl: string;
            faviconUrl: string;
            homeBannerUrl: string;
            updatedAt: string | null;
        };
    }>;
}
