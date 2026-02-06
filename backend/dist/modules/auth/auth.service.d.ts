import { JwtService } from "@nestjs/jwt";
export declare class AuthService {
    private jwtService;
    constructor(jwtService: JwtService);
    login(adminKey: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    validateToken(token: string): Promise<boolean>;
}
