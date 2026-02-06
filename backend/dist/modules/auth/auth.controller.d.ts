import { AuthService } from "./auth.service";
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(adminKey: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    validate(token: string): Promise<{
        valid: boolean;
    }>;
}
