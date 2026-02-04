import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("regions")
export class RegionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("config")
  async config() {
    const config = await this.prisma.regionConfig.findUnique({ where: { key: "default" } });
    return {
      config:
        config?.payload ||
        {
          countryCodes: [
            { code: "+1", label: "US" },
            { code: "+82", label: "KR" },
            { code: "+86", label: "CN" },
            { code: "+81", label: "JP" },
            { code: "+65", label: "SG" },
          ],
          lengthRules: {
            "+1": [10],
            "+82": [9, 10, 11],
            "+86": [11],
            "+81": [9, 10, 11],
            "+65": [8],
          },
        },
    };
  }
}
