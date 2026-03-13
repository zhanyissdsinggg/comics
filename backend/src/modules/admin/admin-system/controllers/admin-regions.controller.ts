import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBody } from "@nestjs/swagger";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { parseStoredJson, stringifyStoredJson } from "../../../../common/utils/stored-json";
import { regionConfigCache } from "../../../regions/region-config.cache";
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

function normalizeDialCode(value: unknown): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return trimmed;
  }

  return `+${digits}`;
}

function normalizeRegionCode(input: RegionCodeInput): { code: string; label: string } {
  return {
    code: normalizeDialCode(input.code),
    label: String(input.label || "").trim(),
  };
}

function buildCountryCodes(input: RegionCodeInput[]): Array<{ code: string; label: string }> {
  const seen = new Set<string>();
  const normalized = input
    .map(normalizeRegionCode)
    .filter((item) => item.code);

  normalized.forEach((item) => {
    if (seen.has(item.code)) {
      throw new BadRequestException(`Duplicate country code: ${item.code}`);
    }
    seen.add(item.code);
  });

  return normalized;
}

function normalizeLengthRules(
  input: RegionConfigInput["lengthRules"],
  allowedCodes: Set<string>,
): PhoneLengthRules {
  if (!input || typeof input !== "object") {
    return {};
  }

  const normalized: PhoneLengthRules = {};
  for (const [code, lengths] of Object.entries(input)) {
    const normalizedCode = normalizeDialCode(code);
    if (!normalizedCode || !allowedCodes.has(normalizedCode) || !Array.isArray(lengths)) {
      continue;
    }

    const values = [...new Set(
      lengths
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )].sort((left, right) => left - right);

    if (values.length > 0) {
      normalized[normalizedCode] = values;
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
    return {
      config: await regionConfigCache.getOrLoad(async () => {
        const config = await this.prisma.regionConfig.findUnique({ where: { region: "default" } });
        return parseStoredJson(config?.payload, DEFAULT_REGION_CONFIG);
      }),
    };
  }

  @Post()
  @ApiBody({ type: CreateRegionDto, required: false })
  async save(@Body() body: CreateRegionDto & RegionConfigInput) {
    const source = extractRegionPayload(body);
    const countryCodes = buildCountryCodes(Array.isArray(source.countryCodes) ? source.countryCodes : []);
    const payload: SavedRegionConfig = {
      countryCodes,
      lengthRules: normalizeLengthRules(source.lengthRules, new Set(countryCodes.map((item) => item.code))),
      updatedAt: new Date().toISOString(),
    };
    const config = await this.prisma.regionConfig.upsert({
      where: { region: "default" },
      update: { payload: stringifyStoredJson(payload) },
      create: { region: "default", config: "default", payload: stringifyStoredJson(payload) },
    });
    const parsed = parseStoredJson(config.payload, payload);
    regionConfigCache.set(parsed);

    return { config: parsed };
  }
}
