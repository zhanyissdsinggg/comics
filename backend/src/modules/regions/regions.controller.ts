import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { parseStoredJson } from "../../common/utils/stored-json";
import { regionConfigCache } from "./region-config.cache";

type PhoneLengthRules = Record<string, number[]>;

type RegionConfig = {
  countryCodes: Array<{ code: string; label: string }>;
  lengthRules: PhoneLengthRules;
};

const DEFAULT_REGION_CONFIG: RegionConfig = {
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
};

@Controller("regions")
export class RegionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("config")
  async config() {
    return {
      config: await regionConfigCache.getOrLoad(async () => {
        const config = await this.prisma.regionConfig.findUnique({ where: { region: "default" } });
        return parseStoredJson(config?.payload, DEFAULT_REGION_CONFIG);
      }),
    };
  }
}
