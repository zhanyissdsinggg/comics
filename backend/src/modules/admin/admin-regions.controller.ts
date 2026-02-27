import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@Controller("admin/regions")
@UseGuards(AdminAuthGuard)
export class AdminRegionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig() {
    const config = await this.prisma.regionConfig.findUnique({ where: { region: "default" } });
    return { config: config?.payload ? JSON.parse(config.payload) : { countryCodes: [], lengthRules: {} } };
  }

  @Post()
  async save(@Body() body: any) {
    const countryCodes = Array.isArray(body?.countryCodes) ? body.countryCodes : [];
    const lengthRules = body?.lengthRules || {};
    const payload = {
      countryCodes: countryCodes
        .map((item: any) => ({
          code: String(item.code || "").trim(),
          label: String(item.label || "").trim(),
        }))
        .filter((item: any) => item.code),
      lengthRules,
      updatedAt: new Date().toISOString(),
    };
    const config = await this.prisma.regionConfig.upsert({
      where: { region: "default" },
      update: { payload: JSON.stringify(payload) },
      create: { region: "default", config: "default", payload: JSON.stringify(payload) },
    });
    return { config: JSON.parse(config.payload || "{}") };
  }
}
