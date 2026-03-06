import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { PrismaService } from "../../common/prisma/prisma.service";
import { buildCookieOptions } from "../../common/utils/cookies";
import { AuthService } from "./auth.service";

const GOOGLE_OAUTH_CLIENT = new OAuth2Client();
const SESSION_COOKIE_NAME = "mn_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

type AuthenticatedRequest = Request & {
  userId?: string;
  userEmail?: string;
};

type GooglePayload = {
  email?: string;
  email_verified?: boolean;
  name?: string;
};

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("me")
  async me(@Req() req: AuthenticatedRequest) {
    const userId = req.userId;
    if (!userId) {
      return {
        success: true,
        user: null,
        isSignedIn: false,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
      },
    });

    if (!user || user.isBlocked) {
      return {
        success: true,
        user: null,
        isSignedIn: false,
      };
    }

    return {
      success: true,
      isSignedIn: true,
      user: {
        id: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: "user",
        emailVerified: true,
      },
    };
  }

  @Post("google/callback")
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Body("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const normalizedToken = typeof token === "string" ? token.trim() : "";
    if (!normalizedToken) {
      throw new BadRequestException("Missing Google token");
    }

    const googleClientId =
      process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    if (!googleClientId) {
      throw new InternalServerErrorException("Google login is not configured");
    }

    let payload: GooglePayload | undefined;
    try {
      const ticket = await GOOGLE_OAUTH_CLIENT.verifyIdToken({
        idToken: normalizedToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload() as GooglePayload | undefined;
    } catch {
      throw new UnauthorizedException("Invalid Google token");
    }

    const email = String(payload?.email || "").trim().toLowerCase();
    if (!email || !payload?.email_verified) {
      throw new UnauthorizedException("Google account email is not verified");
    }

    const normalizedName =
      typeof payload?.name === "string" && payload.name.trim().length > 0
        ? payload.name.trim()
        : null;

    const user = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: normalizedName,
      },
      update: {
        name: normalizedName ?? undefined,
      },
    });

    await this.prisma.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    const sessionToken = randomBytes(32).toString("hex");

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    res.cookie(
      SESSION_COOKIE_NAME,
      sessionToken,
      buildCookieOptions({
        httpOnly: true,
        maxAge: SESSION_DURATION_SECONDS * 1000,
      }),
    );

    return {
      success: true,
      ok: true,
      isSignedIn: true,
      user: {
        id: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: "user",
        emailVerified: true,
      },
    };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body("adminKey") adminKey: string) {
    return this.authService.login(adminKey);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body("refreshToken") refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Get("preferences")
  async preferences(@Req() req: AuthenticatedRequest) {
    if (!req.userId) {
      return {
        success: true,
        preferences: {
          theme: "dark",
          language: "en",
          adultMode: false,
        },
      };
    }

    return {
      success: true,
      preferences: {
        theme: "dark",
        language: "en",
        adultMode: false,
      },
    };
  }

  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validate(@Body("token") token: string) {
    const valid = await this.authService.validateToken(token);
    return { valid };
  }
}
