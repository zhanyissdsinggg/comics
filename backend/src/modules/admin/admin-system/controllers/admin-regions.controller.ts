import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { parseStoredJson, stringifyStoredJson } from "../../../../common/utils/stored-json";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { CreateRegionDto, PhoneLengthRules, RegionConfigInput, RegionCodeInput } from "../dtos/admin-system.dto";

type SavedRegionConfig = {
  countryCodes: Array<{ code: string; label: string }>;
  lengthRules: PhoneLengthRules;
  updatedAt?: string;
};

const DEFAULT_REGION_CONFIG: SavedRegionConfig = {
  countryCodes: [],
  lengthRules: {},
};

function normalizeRegionCode(input: RegionCodeInput): { code: string; label: string } {
  return {
    code: String(input.code || "").trim(),
    label: String(input.label || "").trim(),
  };
}

function normalizeLengthRules(input: RegionConfigInput["lengthRules"]): PhoneLengthRules {
  if (!input || typeof input !== "object") {
    return {};
  }

  const normalized: PhoneLengthRules = {};
  for (const [code, lengths] of Object.entries(input)) {
    if (!Array.isArray(lengths)) {
      continue;
    }
    const values = lengths
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    if (values.length > 0) {
      normalized[code] = values;
    }
  }
  return normalized;
}

function extractRegionPayload(body: CreateRegionDto & RegionConfigInput): RegionConfigInput {
  return body?.region || body;
}

@Controller("admin/regions")
@UseGuards(AdminAuthGuard)
export class AdminRegionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getConfig() {
    const config = await this.prisma.regionConfig.findUnique({ where: { region: "default" } });

    return {
      config: parseStoredJson(config?.payload, DEFAULT_REGION_CONFIG),
    };
  }

  @Post()
  async save(@Body() body: CreateRegionDto & RegionConfigInput) {
    const source = extractRegionPayload(body);
    const countryCodes = Array.isArray(source.countryCodes) ? source.countryCodes : [];
    const payload: SavedRegionConfig = {
      countryCodes: countryCodes.map(normalizeRegionCode).filter((item) => item.code),
      lengthRules: normalizeLengthRules(source.lengthRules),
      updatedAt: new Date().toISOString(),
    };
    const config = await this.prisma.regionConfig.upsert({
      where: { region: "default" },
      update: { payload: stringifyStoredJson(payload) },
      create: { region: "default", config: "default", payload: stringifyStoredJson(payload) },
    });

    return { config: parseStoredJson(config.payload, payload) };
  }
}