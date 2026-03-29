import { Prisma } from "@prisma/client";
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { ContentCacheInvalidationService } from "../../../../common/cache/content-cache-invalidation.service";
import { isAdminContentGeneratorEnabledConfig } from "../../../../common/config/app-config";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { buildPublicAssetUrl } from "../../../../common/utils/public-asset-url";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";

type GeneratorContentType = "comic" | "novel";

type SeriesSeed = {
  title: string;
  description: string;
  genres: string[];
  coverTone: string;
  adult?: boolean;
};

type GeneratorSettings = {
  seriesPerType: number;
  minEpisodes: number;
  maxEpisodes: number;
};

type GeneratorRequestBody = {
  seed?: string;
  seriesPerType?: number | string;
  minEpisodes?: number | string;
  maxEpisodes?: number | string;
};

type GeneratedBatch = {
  seriesRecords: Prisma.SeriesCreateManyInput[];
  episodeRecords: Prisma.EpisodeCreateManyInput[];
};

const DEFAULT_SERIES_PER_TYPE = 20;
const MAX_SERIES_PER_TYPE = 20;
const DEFAULT_MIN_EPISODES = 10;
const DEFAULT_MAX_EPISODES = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const COMIC_SEEDS: SeriesSeed[] = [
  {
    title: "Midnight Contract",
    description:
      "Two rivals become unwilling partners after a supernatural contract binds their futures.",
    genres: ["Romance", "Drama"],
    coverTone: "warm",
  },
  {
    title: "Neon District",
    description:
      "A courier with a hidden power tears through a lawless cyberpunk city.",
    genres: ["Action", "Sci-Fi"],
    coverTone: "neon",
  },
  {
    title: "Crimson Thesis",
    description:
      "An elite arts academy hides brutal rivalries behind polished marble walls.",
    genres: ["Drama", "Mystery"],
    coverTone: "crimson",
  },
  {
    title: "Velvet Trigger",
    description:
      "A noir assassin romance where every mission puts love and loyalty at war.",
    genres: ["Thriller", "Romance"],
    coverTone: "noir",
    adult: true,
  },
  {
    title: "Skyline Heist",
    description:
      "A rooftop crew steals impossible secrets from the most secure towers on earth.",
    genres: ["Action", "Adventure"],
    coverTone: "cool",
  },
  {
    title: "Petal Requiem",
    description:
      "A quiet flower shop becomes the center of an old family curse.",
    genres: ["Fantasy", "Drama"],
    coverTone: "pastel",
  },
  {
    title: "Iron Pulse",
    description:
      "Teen pilots sync with biomechanical armor to survive a collapsing megacity.",
    genres: ["Sci-Fi", "Action"],
    coverTone: "steel",
  },
  {
    title: "Queens of Ash",
    description:
      "A palace succession battle turns deadly when prophecy enters the court.",
    genres: ["Fantasy", "Historical"],
    coverTone: "gold",
  },
  {
    title: "Double Exposure",
    description:
      "A celebrity photographer uncovers a conspiracy hidden inside her own archive.",
    genres: ["Mystery", "Drama"],
    coverTone: "silver",
  },
  {
    title: "Last Set Point",
    description: "A washed-up prodigy chases one final championship run.",
    genres: ["Sports", "Drama"],
    coverTone: "sunset",
  },
];

const NOVEL_SEEDS: SeriesSeed[] = [
  {
    title: "Empire of Salt",
    description:
      "A disgraced strategist rebuilds power from the ruins of a coastal kingdom.",
    genres: ["Fantasy", "Adventure"],
    coverTone: "sand",
  },
  {
    title: "After the Firewall",
    description:
      "A rogue analyst escapes a corporate state with the only key to the truth.",
    genres: ["Sci-Fi", "Thriller"],
    coverTone: "cobalt",
  },
  {
    title: "Second Bloom",
    description:
      "A chef returns home and finds that grief can be rebuilt into family.",
    genres: ["Slice of Life", "Drama"],
    coverTone: "rose",
  },
  {
    title: "The Fourth Witness",
    description:
      "A courtroom thriller where each testimony rewrites the crime.",
    genres: ["Mystery", "Thriller"],
    coverTone: "slate",
  },
  {
    title: "Winter Meridian",
    description:
      "Explorers cross a frozen continent to stop a machine buried under the ice.",
    genres: ["Adventure", "Sci-Fi"],
    coverTone: "frost",
  },
  {
    title: "Velour Hearts",
    description:
      "A luxury hotel romance where secrets cost more than the suites.",
    genres: ["Romance", "Drama"],
    coverTone: "plum",
    adult: true,
  },
  {
    title: "Atlas Breaker",
    description:
      "An ex-soldier follows an impossible map that keeps changing every night.",
    genres: ["Action", "Adventure"],
    coverTone: "ember",
  },
  {
    title: "House of Lanterns",
    description:
      "Ghost stories and inheritance battles collide inside a seaside manor.",
    genres: ["Supernatural", "Drama"],
    coverTone: "amber",
  },
  {
    title: "Blue Signal",
    description:
      "A former pop idol chases a second career through radio and late-night confession.",
    genres: ["Drama", "Music"],
    coverTone: "indigo",
  },
  {
    title: "Ruin Market",
    description:
      "Merchants, thieves, and relic hunters battle over a city built on ancient machines.",
    genres: ["Fantasy", "Action"],
    coverTone: "bronze",
  },
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePositiveIntField(
  fieldName: string,
  value: unknown,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "number") {
    if (Number.isSafeInteger(value) && value > 0) {
      return value;
    }
    throw new BadRequestException(`${fieldName} must be a positive integer.`);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (/^\d+$/.test(normalized)) {
      const parsed = Number.parseInt(normalized, 10);
      if (Number.isSafeInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
    throw new BadRequestException(`${fieldName} must be a positive integer.`);
  }

  throw new BadRequestException(`${fieldName} must be a positive integer.`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveSettings(body: GeneratorRequestBody): GeneratorSettings {
  const seriesPerType = clamp(
    parsePositiveIntField(
      "seriesPerType",
      body.seriesPerType,
      DEFAULT_SERIES_PER_TYPE,
    ),
    1,
    MAX_SERIES_PER_TYPE,
  );
  const minEpisodes = clamp(
    parsePositiveIntField(
      "minEpisodes",
      body.minEpisodes,
      DEFAULT_MIN_EPISODES,
    ),
    1,
    DEFAULT_MAX_EPISODES,
  );
  const maxEpisodes = clamp(
    parsePositiveIntField(
      "maxEpisodes",
      body.maxEpisodes,
      DEFAULT_MAX_EPISODES,
    ),
    minEpisodes,
    DEFAULT_MAX_EPISODES,
  );

  return {
    seriesPerType,
    minEpisodes,
    maxEpisodes,
  };
}

function isContentGeneratorEnabled(): boolean {
  return isAdminContentGeneratorEnabledConfig();
}

function createSeededRandom(seedInput: string): () => number {
  let seed = 0;
  for (let index = 0; index < seedInput.length; index += 1) {
    seed = (seed * 31 + seedInput.charCodeAt(index)) >>> 0;
  }
  if (seed === 0) {
    seed = 0x12345678;
  }

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function buildSeriesId(
  type: GeneratorContentType,
  runId: string,
  index: number,
): string {
  return `${type}-${runId}-${String(index + 1).padStart(2, "0")}`;
}

function buildTitle(seed: SeriesSeed, index: number, poolSize: number): string {
  const cycle = Math.floor(index / poolSize) + 1;
  return cycle > 1 ? `${seed.title} ${cycle}` : seed.title;
}

const GENERATED_CONTENT_DIR = join(
  process.cwd(),
  "public",
  "uploads",
  "generated",
  "content",
);

type AssetRequest = Pick<Request, "protocol" | "headers" | "get"> | undefined;

const TONE_PALETTES: Record<
  string,
  { background: string; accent: string; foreground: string }
> = {
  warm: { background: "#2f1612", accent: "#ffb36b", foreground: "#fff4e8" },
  neon: { background: "#0d1321", accent: "#29f0b4", foreground: "#ecfeff" },
  crimson: { background: "#2a0f14", accent: "#ff7a8a", foreground: "#fff1f3" },
  noir: { background: "#141414", accent: "#d4af37", foreground: "#f5f5f5" },
  cool: { background: "#10263f", accent: "#76c7ff", foreground: "#eef8ff" },
  pastel: { background: "#2b2130", accent: "#ffb7d5", foreground: "#fff7fb" },
  steel: { background: "#1c2430", accent: "#9ab8d1", foreground: "#edf4fa" },
  gold: { background: "#2d2411", accent: "#f2c96d", foreground: "#fff8e6" },
  silver: { background: "#222831", accent: "#bfc8d6", foreground: "#f6f8fb" },
  sunset: { background: "#331a1a", accent: "#ff8f70", foreground: "#fff1ec" },
  sand: { background: "#2e2417", accent: "#f2c078", foreground: "#fff6e8" },
  cobalt: { background: "#10204a", accent: "#7cc6ff", foreground: "#eef6ff" },
  rose: { background: "#381f2c", accent: "#ff98b3", foreground: "#fff5f8" },
  slate: { background: "#1f2937", accent: "#94a3b8", foreground: "#f8fafc" },
  frost: { background: "#153041", accent: "#9ee7ff", foreground: "#effcff" },
  plum: { background: "#2a1638", accent: "#d39cff", foreground: "#faf5ff" },
  ember: { background: "#311814", accent: "#ff8a5b", foreground: "#fff4ef" },
  amber: { background: "#31220f", accent: "#ffbf5a", foreground: "#fff7e8" },
  indigo: { background: "#1c1c3c", accent: "#8fa7ff", foreground: "#f2f5ff" },
  jade: { background: "#122a22", accent: "#57d6a4", foreground: "#ecfff7" },
  default: { background: "#1f2937", accent: "#60a5fa", foreground: "#f8fafc" },
};

function ensureDirectory(directory: string): void {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeAssetSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-");
  const collapsed = normalized.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return collapsed || "generated";
}

function getTonePalette(tone: string) {
  return TONE_PALETTES[tone] || TONE_PALETTES.default;
}

function toPublicAssetPath(absolutePath: string): string {
  return absolutePath
    .replace(join(process.cwd(), "public"), "")
    .replace(/\\/g, "/");
}

function buildSvgAsset(
  width: number,
  height: number,
  title: string,
  subtitle: string,
  tone: string,
): string {
  const palette = getTonePalette(tone);
  const safeTitle = escapeSvgText(title);
  const safeSubtitle = escapeSvgText(subtitle);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <defs>`,
    `    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`,
    `      <stop offset="0%" stop-color="${palette.background}" />`,
    `      <stop offset="100%" stop-color="#05070d" />`,
    `    </linearGradient>`,
    `  </defs>`,
    `  <rect width="100%" height="100%" fill="url(#bg)" />`,
    `  <circle cx="${Math.round(width * 0.72)}" cy="${Math.round(height * 0.22)}" r="${Math.round(width * 0.18)}" fill="${palette.accent}" opacity="0.18" />`,
    `  <rect x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.66)}" width="${Math.round(width * 0.84)}" height="${Math.round(height * 0.2)}" rx="${Math.round(width * 0.04)}" fill="#05070d" opacity="0.42" />`,
    `  <text x="${Math.round(width * 0.1)}" y="${Math.round(height * 0.76)}" fill="${palette.foreground}" font-size="${Math.round(width * 0.08)}" font-family="Georgia, serif" font-weight="700">${safeTitle}</text>`,
    `  <text x="${Math.round(width * 0.1)}" y="${Math.round(height * 0.83)}" fill="${palette.accent}" font-size="${Math.round(width * 0.04)}" font-family="Arial, sans-serif" letter-spacing="2">${safeSubtitle}</text>`,
    `</svg>`,
  ].join("\n");
}

function writeGeneratedAsset(
  relativeSegments: string[],
  fileName: string,
  fileContent: string,
): string {
  const absolutePath = join(
    GENERATED_CONTENT_DIR,
    ...relativeSegments,
    fileName,
  );
  ensureDirectory(dirname(absolutePath));
  writeFileSync(absolutePath, fileContent, "utf8");
  return toPublicAssetPath(absolutePath);
}

function buildCoverUrl(
  seriesId: string,
  title: string,
  type: GeneratorContentType,
  tone: string,
  request?: AssetRequest,
): string {
  const relativePath = writeGeneratedAsset(
    [sanitizeAssetSegment(seriesId)],
    "cover.svg",
    buildSvgAsset(800, 1200, title, type.toUpperCase(), tone),
  );
  return buildPublicAssetUrl(request, relativePath);
}

function buildComicPages(
  seriesId: string,
  episodeId: string,
  pageCount: number,
  tone: string,
  request?: AssetRequest,
): Array<{ url: string; w: number; h: number }> {
  return Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const relativePath = writeGeneratedAsset(
      [sanitizeAssetSegment(seriesId), sanitizeAssetSegment(episodeId)],
      `page-${String(pageNumber).padStart(2, "0")}.svg`,
      buildSvgAsset(
        800,
        1200,
        `Episode ${pageNumber}`,
        `${seriesId} · ${episodeId}`,
        tone,
      ),
    );

    return {
      url: buildPublicAssetUrl(request, relativePath),
      w: 800,
      h: 1200,
    };
  });
}

function buildNovelParagraphs(
  seed: SeriesSeed,
  episodeNumber: number,
): string[] {
  const fragments = [
    `${seed.title} is the kind of story that moves because every choice has a cost.`,
    "The room stayed quiet long enough for the tension to sharpen into certainty.",
    "Nobody in the chapter walked away unchanged, even if they pretended otherwise.",
    "The new clue felt small at first, but it bent the entire scene around it.",
    "What looked like luck was really preparation colliding with one bad decision.",
  ];

  return Array.from({ length: 18 }, (_, index) => {
    const fragment = fragments[index % fragments.length];
    return `Chapter ${episodeNumber}, paragraph ${index + 1}. ${fragment}`;
  });
}

@Controller("admin/generate-content")
@UseGuards(AdminAuthGuard)
export class AdminContentGeneratorController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentCacheInvalidation: ContentCacheInvalidationService,
  ) {}

  @Post()
  async generate(
    @Body() body: GeneratorRequestBody | unknown = {},
    @Req() req?: Request,
  ) {
    if (!isContentGeneratorEnabled()) {
      throw new ForbiddenException(
        "Content generator is disabled in production. Set ADMIN_CONTENT_GENERATOR_ENABLED=1 to enable it.",
      );
    }

    if (!isPlainObject(body)) {
      throw new BadRequestException("Request body must be an object.");
    }

    const requestBody = body as GeneratorRequestBody;
    const startedAt = Date.now();
    const settings = resolveSettings(requestBody);
    const seedSource =
      requestBody.seed !== undefined
        ? String(requestBody.seed)
        : new Date().toISOString();
    const random = createSeededRandom(seedSource);
    const runId = Date.now().toString(36);

    const comics = this.buildBatch({
      type: "comic",
      runId,
      seeds: COMIC_SEEDS,
      settings,
      random,
      request: req,
    });
    const novels = this.buildBatch({
      type: "novel",
      runId,
      seeds: NOVEL_SEEDS,
      settings,
      random,
      request: req,
    });

    await this.prisma.$transaction([
      this.prisma.series.createMany({
        data: [...comics.seriesRecords, ...novels.seriesRecords],
      }),
      this.prisma.episode.createMany({
        data: [...comics.episodeRecords, ...novels.episodeRecords],
      }),
    ]);

    const generatedSeriesIds = [
      ...comics.seriesRecords,
      ...novels.seriesRecords,
    ]
      .map((item) => item.id)
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      );

    await this.contentCacheInvalidation.invalidateSeriesContent(
      generatedSeriesIds,
      "admin-content-generator",
    );

    return {
      success: true,
      runId,
      comicsCount: comics.seriesRecords.length,
      novelsCount: novels.seriesRecords.length,
      totalEpisodes:
        comics.episodeRecords.length + novels.episodeRecords.length,
      duration: Number(((Date.now() - startedAt) / 1000).toFixed(2)),
      settings,
    };
  }
  private buildBatch(input: {
    type: GeneratorContentType;
    runId: string;
    seeds: SeriesSeed[];
    settings: GeneratorSettings;
    random: () => number;
    request?: AssetRequest;
  }) {
    const seriesRecords: Prisma.SeriesCreateManyInput[] = [];
    const episodeRecords: Prisma.EpisodeCreateManyInput[] = [];

    for (let index = 0; index < input.settings.seriesPerType; index += 1) {
      const seed = input.seeds[index % input.seeds.length];
      const title = buildTitle(seed, index, input.seeds.length);
      const seriesId = buildSeriesId(input.type, input.runId, index);
      const episodeCount = randomInt(
        input.random,
        input.settings.minEpisodes,
        input.settings.maxEpisodes,
      );
      const episodePrice =
        input.type === "comic"
          ? randomInt(input.random, 4, 8)
          : randomInt(input.random, 3, 6);
      const latestEpisodeId = `${seriesId}e${episodeCount}`;
      const isAdult = Boolean(seed.adult);

      seriesRecords.push({
        id: seriesId,
        title,
        type: input.type,
        description: seed.description,
        coverUrl: buildCoverUrl(
          seriesId,
          title,
          input.type,
          seed.coverTone,
          input.request,
        ),
        coverTone: seed.coverTone,
        badge: "",
        badges: [],
        adult: isAdult,
        latestEpisodeId,
        genres: seed.genres,
        status: "Ongoing",
        rating: 0,
        ratingCount: 0,
        episodePrice,
        ttfEnabled: true,
        ttfIntervalHours: 24,
      });

      for (
        let episodeNumber = 1;
        episodeNumber <= episodeCount;
        episodeNumber += 1
      ) {
        const episodeId = `${seriesId}e${episodeNumber}`;
        const releasedAt = new Date(
          Date.now() - (episodeCount - episodeNumber) * DAY_MS,
        );
        const isFree =
          input.type === "comic" ? episodeNumber <= 3 : episodeNumber <= 5;

        episodeRecords.push({
          id: episodeId,
          seriesId,
          title:
            input.type === "comic"
              ? `Episode ${episodeNumber}`
              : `Chapter ${episodeNumber}`,
          number: episodeNumber,
          pricePts: isFree ? 0 : episodePrice,
          ttfEligible: true,
          releasedAt,
          previewFreePages: input.type === "comic" ? 3 : 0,
          pages:
            input.type === "comic"
              ? buildComicPages(
                  seriesId,
                  episodeId,
                  randomInt(input.random, 10, 16),
                  seed.coverTone,
                  input.request,
                )
              : [],
          paragraphs:
            input.type === "novel"
              ? buildNovelParagraphs(seed, episodeNumber)
              : [],
        });
      }
    }

    return { seriesRecords, episodeRecords };
  }
}
