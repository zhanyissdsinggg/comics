import { JwtService } from "@nestjs/jwt";
import { AdminLogService } from "../../common/services/admin-log.service";
export declare class AdminAuthController {
    private readonly jwtService;
    private readonly adminLogService;
    constructor(jwtService: JwtService, adminLogService: AdminLogService);
    login(body: {
        adminKey: string;
    }): Promise<{
        success: boolean;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    refresh(body: {
        refreshToken: string;
    }): Promise<{
        success: boolean;
        accessToken: string;
        expiresIn: number;
    }>;
    verify(body: {
        token: string;
    }): Promise<{
        success: boolean;
        valid: boolean;
        payload: any;
        message?: undefined;
    } | {
        success: boolean;
        valid: boolean;
        message: string;
        payload?: undefined;
    }>;
}
