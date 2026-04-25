import { createHash } from "crypto";
import { CreditRole, CreatorType, Prisma, PrismaClient } from "@prisma/client";
import { resolve } from "path";

const envLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

if (typeof envLoader.loadEnvFile === "function") {
  try {
    envLoader.loadEnvFile(resolve(__dirname, "../.env"));
  } catch {
    // Ignore missing local env files. CI and production should inject env vars directly.
  }
}

const prisma = new PrismaClient();

type CreditSeed = {
  name: string;
  role: CreditRole;
  type?: CreatorType;
  isPrimary?: boolean;
  bio?: string;
};

type SeriesSeed = {
  id: string;
  title: string;
  type: "comic" | "novel";
  adult: boolean;
  genres: string[];
  coverUrl: string;
  coverTone: string;
  status: string;
  description: string;
  episodePrice: number;
  ttfEnabled: boolean;
  ttfIntervalHours: number;
  credits: CreditSeed[];
};

const DEMO_SERIES_ID = "demo-series";
const DEMO_EPISODE_ID = "demo-episode";

type InteractiveStorySeed = {
  id: string;
  seriesId: string;
  slug: string;
  title: string;
  description: string;
  baseContext: string;
  initialState: Record<string, unknown>;
  nodes: Array<{
    id: string;
    key: string;
    title: string;
    fallbackText: string;
    basePrompt: string;
    stateEffects?: Record<string, unknown>;
    requiredFlags?: string[];
    blockedFlags?: string[];
    isEnding?: boolean;
    choices: Array<{
      id: string;
      key: string;
      label: string;
      targetNodeId: string;
      stateEffects?: Record<string, unknown>;
      requiredFlags?: string[];
      blockedFlags?: string[];
    }>;
  }>;
};

function toInputJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildReaderPageDataUrl(options: {
  title: string;
  episodeNumber: number;
  pageNumber: number;
  tone: string;
}) {
  const { title, episodeNumber, pageNumber, tone } = options;
  const safeTitle = escapeXml(title);
  const episodeLabel = `Episode ${episodeNumber}`;
  const pageLabel = `Page ${pageNumber}`;
  const layoutLabel = pageNumber === 1 ? "Cold open" : pageNumber === 2 ? "Story beat" : "Hook panel";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" fill="none">
      <rect width="800" height="1200" fill="#070b14" />
      <rect width="800" height="1200" fill="url(#bg)" />
      <circle cx="640" cy="200" r="220" fill="${tone}" opacity="0.18" />
      <circle cx="170" cy="1040" r="280" fill="${tone}" opacity="0.12" />
      <rect x="48" y="48" width="704" height="1104" rx="40" fill="#0b1020" fill-opacity="0.84" stroke="${tone}" stroke-opacity="0.45" />
      <rect x="80" y="88" width="186" height="34" rx="17" fill="${tone}" fill-opacity="0.22" />
      <text x="102" y="111" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1.8">EDITORIAL PREVIEW</text>
      <text x="80" y="182" fill="#E5E7EB" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">${safeTitle}</text>
      <text x="80" y="226" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="24">${escapeXml(episodeLabel)} | ${escapeXml(pageLabel)}</text>

      <rect x="80" y="286" width="640" height="246" rx="28" fill="#101a31" stroke="${tone}" stroke-opacity="0.36" />
      <rect x="104" y="310" width="180" height="14" rx="7" fill="${tone}" fill-opacity="0.9" />
      <rect x="104" y="346" width="392" height="18" rx="9" fill="#E5E7EB" fill-opacity="0.92" />
      <rect x="104" y="380" width="510" height="14" rx="7" fill="#CBD5E1" fill-opacity="0.45" />
      <rect x="104" y="408" width="474" height="14" rx="7" fill="#CBD5E1" fill-opacity="0.34" />
      <rect x="104" y="452" width="234" height="40" rx="20" fill="#F8FAFC" />
      <text x="140" y="478" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">${escapeXml(layoutLabel)}</text>

      <rect x="80" y="572" width="306" height="256" rx="26" fill="#0f172a" stroke="#1e293b" />
      <rect x="414" y="572" width="306" height="256" rx="26" fill="#0f172a" stroke="#1e293b" />
      <rect x="80" y="856" width="640" height="196" rx="26" fill="#0f172a" stroke="#1e293b" />

      <rect x="108" y="602" width="250" height="94" rx="20" fill="${tone}" fill-opacity="0.12" />
      <rect x="130" y="626" width="138" height="12" rx="6" fill="${tone}" />
      <rect x="130" y="656" width="174" height="14" rx="7" fill="#E2E8F0" fill-opacity="0.72" />
      <rect x="130" y="684" width="142" height="12" rx="6" fill="#94A3B8" fill-opacity="0.56" />

      <rect x="442" y="602" width="250" height="156" rx="20" fill="#111827" />
      <path d="M470 720 C510 626 596 618 650 684" stroke="${tone}" stroke-width="14" stroke-linecap="round" opacity="0.9" />
      <circle cx="564" cy="660" r="38" fill="${tone}" fill-opacity="0.26" />
      <circle cx="620" cy="690" r="18" fill="#F8FAFC" fill-opacity="0.22" />

      <rect x="108" y="884" width="584" height="138" rx="22" fill="#111827" />
      <rect x="132" y="914" width="220" height="12" rx="6" fill="${tone}" />
      <rect x="132" y="946" width="466" height="16" rx="8" fill="#E2E8F0" fill-opacity="0.76" />
      <rect x="132" y="978" width="422" height="12" rx="6" fill="#94A3B8" fill-opacity="0.56" />

      <text x="80" y="1112" fill="#64748B" font-family="Arial, Helvetica, sans-serif" font-size="18">Local QA artwork for the storefront reader.</text>

      <defs>
        <linearGradient id="bg" x1="96" y1="72" x2="704" y2="1128" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0F172A" />
          <stop offset="1" stop-color="#020617" />
        </linearGradient>
      </defs>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildEpisodePages(series: Pick<SeriesSeed, "title" | "coverTone">, episodeNumber: number) {
  return [1, 2, 3].map((pageNumber) => ({
    url: buildReaderPageDataUrl({
      title: series.title,
      episodeNumber,
      pageNumber,
      tone: series.coverTone || "#22c55e",
    }),
    w: 800,
    h: 1200,
  }));
}

function buildNovelParagraphs(seriesTitle: string, episodeNumber: number) {
  return [
    `${seriesTitle} Episode ${episodeNumber} opens with a quiet decision that changes the direction of the story.`,
    "The lead studies the stakes, weighs the cost, and realizes there is no harmless way forward anymore.",
    "A second beat widens the world, grounding the chapter in consequence instead of spectacle.",
    "By the closing paragraph, the episode lands on a hook that invites the next chapter instead of padding the read.",
  ];
}

function normalizeCreatorName(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugifyCreatorName(value: string) {
  return normalizeCreatorName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function createStableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function createStableSuffix(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 6);
}

function inferCreatorType(name: string): CreatorType {
  const normalized = normalizeCreatorName(name).toLowerCase();
  if (normalized.includes("studio")) {
    return CreatorType.STUDIO;
  }
  if (normalized.includes("team")) {
    return CreatorType.TEAM;
  }
  return CreatorType.PERSON;
}

function buildSeriesAuthor(credits: CreditSeed[]) {
  return normalizeCreatorName(credits.find((credit) => credit.isPrimary)?.name || credits[0]?.name || "");
}

const seriesData: SeriesSeed[] = [
  {
    id: "series-001",
    title: "The Last Kingdom",
    type: "comic",
    adult: false,
    genres: ["Action", "Fantasy", "Adventure"],
    coverUrl: "/mock-covers/series-001.jpg",
    coverTone: "#1a1a2e",
    status: "Ongoing",
    description: "An epic tale of warriors and kingdoms fighting for survival in a world on the brink of collapse.",
    episodePrice: 3,
    ttfEnabled: true,
    ttfIntervalHours: 24,
    credits: [{ name: "Mira Dane", role: CreditRole.AUTHOR, isPrimary: true }],
  },
  {
    id: "series-002",
    title: "Moonlight Sonata",
    type: "comic",
    adult: false,
    genres: ["Romance", "Drama"],
    coverUrl: "/mock-covers/series-002.jpg",
    coverTone: "#2d1b69",
    status: "Ongoing",
    description: "A talented musician falls in love with a mysterious woman who only appears at night.",
    episodePrice: 2,
    ttfEnabled: true,
    ttfIntervalHours: 48,
    credits: [
      { name: "Jae Park", role: CreditRole.WRITER, isPrimary: true },
      { name: "Soo Min", role: CreditRole.ARTIST },
    ],
  },
  {
    id: "series-003",
    title: "Shadow Protocol",
    type: "comic",
    adult: false,
    genres: ["Action", "Sci-Fi", "Thriller"],
    coverUrl: "/mock-covers/series-003.jpg",
    coverTone: "#0d1117",
    status: "Ongoing",
    description: "A cyber-spy thriller set in a near-future world where technology and humanity are at war.",
    episodePrice: 3,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [{ name: "Nightglass Studio", role: CreditRole.STUDIO, type: CreatorType.STUDIO, isPrimary: true }],
  },
  {
    id: "series-004",
    title: "Cherry Blossom High",
    type: "comic",
    adult: false,
    genres: ["Romance", "Comedy", "Slice of Life"],
    coverUrl: "/mock-covers/series-004.jpg",
    coverTone: "#ff6b9d",
    status: "Completed",
    description: "A heartwarming story of first love and friendship at a high school known for its cherry blossoms.",
    episodePrice: 0,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [{ name: "Hana Seo", role: CreditRole.AUTHOR, isPrimary: true }],
  },
  {
    id: "series-005",
    title: "Dragon's Oath",
    type: "comic",
    adult: false,
    genres: ["Fantasy", "Action", "Adventure"],
    coverUrl: "/mock-covers/series-005.jpg",
    coverTone: "#7b2d00",
    status: "Ongoing",
    description: "A young dragon tamer must fulfill an ancient oath to save the world from eternal darkness.",
    episodePrice: 4,
    ttfEnabled: true,
    ttfIntervalHours: 24,
    credits: [
      { name: "Elias North", role: CreditRole.WRITER, isPrimary: true },
      { name: "Aria Kim", role: CreditRole.ARTIST },
    ],
  },
  {
    id: "series-006",
    title: "Neon Nights",
    type: "novel",
    adult: false,
    genres: ["Mystery", "Thriller", "Noir"],
    coverUrl: "/mock-covers/series-006.jpg",
    coverTone: "#0a0a0a",
    status: "Ongoing",
    description: "A hardboiled detective navigates the seedy underbelly of a neon-lit cyberpunk city.",
    episodePrice: 2,
    ttfEnabled: true,
    ttfIntervalHours: 72,
    credits: [{ name: "Cole Mercer", role: CreditRole.AUTHOR, isPrimary: true }],
  },
  {
    id: "series-007",
    title: "The Quiet Storm",
    type: "comic",
    adult: false,
    genres: ["Drama", "Slice of Life"],
    coverUrl: "/mock-covers/series-007.jpg",
    coverTone: "#4a90d9",
    status: "Ongoing",
    description: "Life in a small coastal town gets complicated when a mysterious stranger arrives.",
    episodePrice: 2,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [{ name: "Lena Brooks", role: CreditRole.AUTHOR, isPrimary: true }],
  },
  {
    id: "series-008",
    title: "Apex Predator",
    type: "comic",
    adult: false,
    genres: ["Action", "Sports", "Drama"],
    coverUrl: "/mock-covers/series-008.jpg",
    coverTone: "#1f1f1f",
    status: "Ongoing",
    description: "A disgraced MMA champion fights his way back to the top against all odds.",
    episodePrice: 3,
    ttfEnabled: true,
    ttfIntervalHours: 24,
    credits: [{ name: "Hammerline Team", role: CreditRole.TEAM, type: CreatorType.TEAM, isPrimary: true }],
  },
  {
    id: "series-009",
    title: "Starfall Academy",
    type: "comic",
    adult: false,
    genres: ["Fantasy", "Romance", "School Life"],
    coverUrl: "/mock-covers/series-009.jpg",
    coverTone: "#1a0533",
    status: "Ongoing",
    description: "At a magical academy for gifted students, a scholarship girl discovers she may be the chosen one.",
    episodePrice: 3,
    ttfEnabled: true,
    ttfIntervalHours: 24,
    credits: [
      { name: "Naomi Vale", role: CreditRole.WRITER, isPrimary: true },
      { name: "Kei Tan", role: CreditRole.ARTIST },
    ],
  },
  {
    id: "series-010",
    title: "Crimson Tide",
    type: "comic",
    adult: false,
    genres: ["Horror", "Supernatural", "Action"],
    coverUrl: "/mock-covers/series-010.jpg",
    coverTone: "#1a0000",
    status: "Completed",
    description: "A vampire hunter discovers the line between monster and human is thinner than she thought.",
    episodePrice: 0,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [{ name: "Rook Hollow Studio", role: CreditRole.STUDIO, type: CreatorType.STUDIO, isPrimary: true }],
  },
  {
    id: "series-011",
    title: "Solar Wind",
    type: "novel",
    adult: false,
    genres: ["Sci-Fi", "Adventure", "Space"],
    coverUrl: "/mock-covers/series-011.jpg",
    coverTone: "#000033",
    status: "Ongoing",
    description: "A crew of misfits aboard a salvage ship uncovers an ancient alien conspiracy.",
    episodePrice: 2,
    ttfEnabled: true,
    ttfIntervalHours: 48,
    credits: [
      { name: "Tess Calder", role: CreditRole.AUTHOR, isPrimary: true },
      { name: "Orbital Forge Team", role: CreditRole.TEAM, type: CreatorType.TEAM },
    ],
  },
  {
    id: "series-012",
    title: "Wild Hearts",
    type: "comic",
    adult: false,
    genres: ["Romance", "Western", "Adventure"],
    coverUrl: "/mock-covers/series-012.jpg",
    coverTone: "#8b4513",
    status: "Ongoing",
    description: "Two rivals must work together to survive the untamed frontier and resist their undeniable attraction.",
    episodePrice: 2,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [
      { name: "June Holloway", role: CreditRole.WRITER, isPrimary: true },
      { name: "Rafael Cruz", role: CreditRole.ARTIST },
    ],
  },
];

const recommendationSlotData: Array<{
  slot: string;
  seriesIds: string[];
}> = [
  {
    slot: "home-hero",
    seriesIds: ["series-001", "series-009", "series-005"],
  },
  {
    slot: "home-free-start",
    seriesIds: ["series-004", "series-010", "series-007"],
  },
  {
    slot: "home-binge-ready",
    seriesIds: ["series-008", "series-011", "series-003"],
  },
  {
    slot: "home-breakout",
    seriesIds: ["series-012", "series-002", "series-006"],
  },
  {
    slot: "library-return",
    seriesIds: ["series-001", "series-008", "series-011"],
  },
];

const interactiveStorySeeds: InteractiveStorySeed[] = [
  {
    id: "story-solar-wind-001",
    seriesId: "series-011",
    slug: "solar-wind-first-contact",
    title: "Solar Wind: First Contact",
    description:
      "A structured interactive branch set in the Solar Wind universe.",
    baseContext:
      "You are on the salvage ship Solar Wind. The crew is entering a dark relay field where an unknown signal wakes ancient systems.",
    initialState: {
      affection: 0,
      trust: 0,
      risk: 1,
      clues: 0,
      flags: [],
    },
    nodes: [
      {
        id: "story-solar-wind-node-001",
        key: "relay_entrance",
        title: "Relay Entrance",
        fallbackText:
          "The ship slips into the relay shadow. Consoles flicker, and a fractured beacon starts repeating coordinates no one recognizes.",
        basePrompt:
          "Write a tense but clear setup paragraph as the crew enters a dangerous relay zone.",
        choices: [
          {
            id: "story-solar-wind-choice-001",
            key: "scan_signal",
            label: "Run a deep scan before moving.",
            targetNodeId: "story-solar-wind-node-002",
            stateEffects: { trust: 1, clues: 1, risk: -1, flags: ["cautious_scan"] },
          },
          {
            id: "story-solar-wind-choice-002",
            key: "approach_beacon",
            label: "Approach the beacon at half thrust.",
            targetNodeId: "story-solar-wind-node-003",
            stateEffects: { risk: 2, clues: 1, flags: ["direct_approach"] },
          },
          {
            id: "story-solar-wind-choice-003",
            key: "wake_captain",
            label: "Wake the captain and hold position.",
            targetNodeId: "story-solar-wind-node-004",
            stateEffects: { affection: 1, trust: 1, risk: -1, flags: ["captain_alerted"] },
          },
        ],
      },
      {
        id: "story-solar-wind-node-002",
        key: "scan_results",
        title: "Scan Results",
        fallbackText:
          "The deep scan reveals layered encryption tied to a vanished survey fleet. Hidden inside is a map fragment pointing deeper into the relay.",
        basePrompt:
          "Write a discovery paragraph that rewards caution and reveals credible clues.",
        stateEffects: { clues: 1 },
        choices: [
          {
            id: "story-solar-wind-choice-004",
            key: "share_with_crew",
            label: "Share findings with the full crew.",
            targetNodeId: "story-solar-wind-node-005",
            stateEffects: { trust: 1, flags: ["crew_briefed"] },
          },
          {
            id: "story-solar-wind-choice-005",
            key: "keep_private",
            label: "Keep it between you and the navigator.",
            targetNodeId: "story-solar-wind-node-006",
            stateEffects: { risk: 1, flags: ["intel_hidden"] },
          },
        ],
      },
      {
        id: "story-solar-wind-node-003",
        key: "beacon_contact",
        title: "Beacon Contact",
        fallbackText:
          "As the hull nears the beacon, dormant defense drones warm up. Your approach wakes something that was never meant to track living ships.",
        basePrompt:
          "Write an immediate escalation paragraph caused by an aggressive approach.",
        stateEffects: { risk: 1 },
        choices: [
          {
            id: "story-solar-wind-choice-006",
            key: "deploy_decoys",
            label: "Deploy decoys and break line-of-sight.",
            targetNodeId: "story-solar-wind-node-005",
            stateEffects: { risk: -1, clues: 1, flags: ["decoys_used"] },
          },
          {
            id: "story-solar-wind-choice-007",
            key: "force_dock",
            label: "Force dock with the beacon shell.",
            targetNodeId: "story-solar-wind-node-007",
            stateEffects: { risk: 2, clues: 2, flags: ["forced_dock"] },
          },
        ],
      },
      {
        id: "story-solar-wind-node-004",
        key: "captain_bridge",
        title: "Captain on Bridge",
        fallbackText:
          "The captain arrives in silence, studies the telemetry, and hands command back to you with one line: \"Make the call we can survive.\"",
        basePrompt:
          "Write a character-focused paragraph where leadership pressure sharpens the decision.",
        stateEffects: { trust: 1 },
        choices: [
          {
            id: "story-solar-wind-choice-008",
            key: "cautious_path",
            label: "Take the cautious scan route.",
            targetNodeId: "story-solar-wind-node-002",
            stateEffects: { trust: 1, flags: ["captain_approved_scan"] },
          },
          {
            id: "story-solar-wind-choice-009",
            key: "bold_path",
            label: "Commit to the direct beacon approach.",
            targetNodeId: "story-solar-wind-node-003",
            stateEffects: { affection: 1, risk: 1, flags: ["captain_backed_risk"] },
          },
        ],
      },
      {
        id: "story-solar-wind-node-005",
        key: "relay_hub_entry",
        title: "Relay Hub Entry",
        fallbackText:
          "With partial control restored, the Solar Wind reaches a sealed relay hub. The next move determines whether this becomes a rescue mission or a trap.",
        basePrompt:
          "Write a transition paragraph into the next chapter hook with controlled suspense.",
        isEnding: true,
        choices: [
          {
            id: "story-solar-wind-choice-010",
            key: "continue_next_arc",
            label: "Continue to Chapter 2",
            targetNodeId: "story-solar-wind-node-005",
            stateEffects: { flags: ["chapter_one_complete"] },
          },
        ],
      },
      {
        id: "story-solar-wind-node-006",
        key: "silent_split",
        title: "Silent Split",
        fallbackText:
          "Keeping intel private buys speed but fractures trust on the bridge. When a mismatch appears in the map, no one agrees which coordinate is real.",
        basePrompt:
          "Write a consequence paragraph where secrecy creates team tension.",
        choices: [
          {
            id: "story-solar-wind-choice-011",
            key: "admit_now",
            label: "Reveal the hidden intel now.",
            targetNodeId: "story-solar-wind-node-005",
            stateEffects: { trust: 1, risk: -1, flags: ["late_truth"] },
          },
          {
            id: "story-solar-wind-choice-012",
            key: "double_down",
            label: "Double down and choose alone.",
            targetNodeId: "story-solar-wind-node-007",
            stateEffects: { risk: 2, clues: 1, flags: ["solo_command"] },
          },
        ],
      },
      {
        id: "story-solar-wind-node-007",
        key: "hazard_core",
        title: "Hazard Core",
        fallbackText:
          "The beacon shell opens into a hazard core. Emergency lights bloom red as automated systems identify your crew as contamination.",
        basePrompt:
          "Write a high-risk paragraph that ends with a clean cliffhanger.",
        isEnding: true,
        choices: [
          {
            id: "story-solar-wind-choice-013",
            key: "retreat_protocol",
            label: "Trigger emergency retreat.",
            targetNodeId: "story-solar-wind-node-007",
            stateEffects: { flags: ["hazard_retreat"] },
          },
        ],
      },
    ],
  },
];

async function upsertCreatorCredits(series: SeriesSeed) {
  await prisma.seriesCredit.deleteMany({
    where: {
      seriesId: series.id,
      source: { in: ["seed", "legacy_author"] },
    },
  });

  for (const [index, credit] of series.credits.entries()) {
    const normalizedName = normalizeCreatorName(credit.name);
    const normalizedKey = normalizedName.toLowerCase();
    const creatorId = createStableId("creator", normalizedKey);
    const slugBase = slugifyCreatorName(normalizedName) || "creator";
    const slug = `${slugBase}-${createStableSuffix(normalizedKey)}`;
    const creatorType = credit.type || inferCreatorType(normalizedName);

    await prisma.creator.upsert({
      where: { normalizedName: normalizedKey },
      update: {
        name: normalizedName,
        slug,
        type: creatorType,
        bio: credit.bio || null,
        isPublic: true,
      },
      create: {
        id: creatorId,
        slug,
        name: normalizedName,
        normalizedName: normalizedKey,
        type: creatorType,
        bio: credit.bio || null,
        isPublic: true,
      },
    });

    await prisma.seriesCredit.upsert({
      where: {
        seriesId_creatorId_role: {
          seriesId: series.id,
          creatorId,
          role: credit.role,
        },
      },
      update: {
        source: "seed",
        sortOrder: index,
        isPrimary: credit.isPrimary ?? index === 0,
        isPublic: true,
      },
      create: {
        id: createStableId("credit", `${series.id}:${creatorId}:${credit.role}`),
        seriesId: series.id,
        creatorId,
        role: credit.role,
        source: "seed",
        sortOrder: index,
        isPrimary: credit.isPrimary ?? index === 0,
        isPublic: true,
      },
    });
  }
}

async function seedSeries() {
  for (const series of seriesData) {
    const author = buildSeriesAuthor(series.credits);
    await prisma.series.upsert({
      where: { id: series.id },
      update: {
        title: series.title,
        author,
        type: series.type,
        adult: series.adult,
        isPublished: true,
        genres: series.genres,
        coverTone: series.coverTone,
        coverUrl: series.coverUrl,
        status: series.status,
        description: series.description,
        episodePrice: series.episodePrice,
        ttfEnabled: series.ttfEnabled,
        ttfIntervalHours: series.ttfIntervalHours,
      },
      create: {
        id: series.id,
        title: series.title,
        author,
        type: series.type,
        adult: series.adult,
        isPublished: true,
        genres: series.genres,
        coverTone: series.coverTone,
        coverUrl: series.coverUrl,
        status: series.status,
        description: series.description,
        episodePrice: series.episodePrice,
        ttfEnabled: series.ttfEnabled,
        ttfIntervalHours: series.ttfIntervalHours,
      },
    });
    await upsertCreatorCredits(series);
    console.log(`seeded series ${series.id} (${series.title})`);
  }
}

async function seedEpisodes() {
  const latestEpisodeBySeries = new Map<string, string>();

  for (const series of seriesData) {
    const episodeCount = series.status === "Completed" ? 5 : 3;
    for (let number = 1; number <= episodeCount; number += 1) {
      const episodeId = `${series.id}e${number}`;
      const releasedAt = new Date(Date.now() - (episodeCount - number) * 7 * 24 * 60 * 60 * 1000);
      const pricePts = number === 1 ? 0 : series.episodePrice;
      const novelParagraphs = series.type === "novel" ? buildNovelParagraphs(series.title, number) : [];

      await prisma.episode.upsert({
        where: { id: episodeId },
        update: {
          seriesId: series.id,
          number,
          title: `Episode ${number}`,
          releasedAt,
          pricePts,
          ttfEligible: series.ttfEnabled,
          ttfReadyAt: series.ttfEnabled
            ? new Date(releasedAt.getTime() + series.ttfIntervalHours * 60 * 60 * 1000)
            : null,
          previewFreePages: series.type === "comic" ? 3 : 0,
          pages: series.type === "comic" ? buildEpisodePages(series, number) : [],
          paragraphs: novelParagraphs,
          text: novelParagraphs.length > 0 ? novelParagraphs.join("\n\n") : null,
          isDeleted: false,
        },
        create: {
          id: episodeId,
          seriesId: series.id,
          number,
          title: `Episode ${number}`,
          releasedAt,
          pricePts,
          ttfEligible: series.ttfEnabled,
          ttfReadyAt: series.ttfEnabled
            ? new Date(releasedAt.getTime() + series.ttfIntervalHours * 60 * 60 * 1000)
            : null,
          previewFreePages: series.type === "comic" ? 3 : 0,
          pages: series.type === "comic" ? buildEpisodePages(series, number) : [],
          paragraphs: novelParagraphs,
          text: novelParagraphs.length > 0 ? novelParagraphs.join("\n\n") : null,
          isDeleted: false,
        },
      });

      latestEpisodeBySeries.set(series.id, episodeId);
    }
  }

  for (const series of seriesData) {
    await prisma.series.update({
      where: { id: series.id },
      data: {
        latestEpisodeId: latestEpisodeBySeries.get(series.id) || null,
      },
    });
  }
}

async function seedDemoSeries() {
  // This demo fixture exists purely so production can reliably open the
  // canonical smoke-check routes: /series/demo-series and /read/demo-series/demo-episode.
  // It is safe to run multiple times (upsert) and intentionally minimal.
  const credits: CreditSeed[] = [
    {
      name: "Gush Demo Studio",
      role: CreditRole.STUDIO,
      type: CreatorType.STUDIO,
      isPrimary: true,
      bio: "Demo creator used for smoke checks.",
    },
  ];
  const author = buildSeriesAuthor(credits);
  const coverTone = "#0ea5e9";

  await prisma.series.upsert({
    where: { id: DEMO_SERIES_ID },
    update: {
      title: "Demo Series",
      author,
      type: "comic",
      adult: false,
      isPublished: true,
      genres: ["Demo", "Action"],
      coverTone,
      coverUrl: "/mock-covers/series-001.jpg",
      status: "Ongoing",
      description:
        "A lightweight demo series used for platform smoke tests and reader QA.",
      episodePrice: 0,
      ttfEnabled: false,
      ttfIntervalHours: 24,
      latestEpisodeId: DEMO_EPISODE_ID,
    },
    create: {
      id: DEMO_SERIES_ID,
      title: "Demo Series",
      author,
      type: "comic",
      adult: false,
      isPublished: true,
      genres: ["Demo", "Action"],
      coverTone,
      coverUrl: "/mock-covers/series-001.jpg",
      status: "Ongoing",
      description:
        "A lightweight demo series used for platform smoke tests and reader QA.",
      episodePrice: 0,
      ttfEnabled: false,
      ttfIntervalHours: 24,
      latestEpisodeId: DEMO_EPISODE_ID,
    },
  });

  await upsertCreatorCredits({
    id: DEMO_SERIES_ID,
    title: "Demo Series",
    type: "comic",
    adult: false,
    genres: ["Demo", "Action"],
    coverUrl: "/mock-covers/series-001.jpg",
    coverTone,
    status: "Ongoing",
    description:
      "A lightweight demo series used for platform smoke tests and reader QA.",
    episodePrice: 0,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits,
  });

  const releasedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await prisma.episode.upsert({
    where: { id: DEMO_EPISODE_ID },
    update: {
      seriesId: DEMO_SERIES_ID,
      number: 1,
      title: "Demo Episode",
      releasedAt,
      pricePts: 0,
      ttfEligible: false,
      ttfReadyAt: null,
      previewFreePages: 3,
      pages: buildEpisodePages(
        { title: "Demo Series", coverTone },
        1,
      ),
      paragraphs: [],
      text: null,
      isDeleted: false,
    },
    create: {
      id: DEMO_EPISODE_ID,
      seriesId: DEMO_SERIES_ID,
      number: 1,
      title: "Demo Episode",
      releasedAt,
      pricePts: 0,
      ttfEligible: false,
      ttfReadyAt: null,
      previewFreePages: 3,
      pages: buildEpisodePages(
        { title: "Demo Series", coverTone },
        1,
      ),
      paragraphs: [],
      text: null,
      isDeleted: false,
    },
  });

  console.log(`seeded demo series ${DEMO_SERIES_ID} + episode ${DEMO_EPISODE_ID}`);
}

async function seedTopupPackages() {
  const topupPackages = [
    {
      id: "pkg-100",
      name: "100 Points",
      amount: 100,
      paidPts: 100,
      bonusPts: 0,
      price: 99,
      currency: "USD",
      active: true,
      label: "Starter",
      tags: [],
    },
    {
      id: "pkg-300",
      name: "300 Points",
      amount: 300,
      paidPts: 300,
      bonusPts: 30,
      price: 279,
      currency: "USD",
      active: true,
      label: "Popular",
      tags: [],
    },
    {
      id: "pkg-500",
      name: "500 Points",
      amount: 500,
      paidPts: 500,
      bonusPts: 80,
      price: 449,
      currency: "USD",
      active: true,
      label: "Best value",
      tags: [],
    },
  ];

  for (const pkg of topupPackages) {
    await prisma.topupPackage.upsert({
      where: { id: pkg.id },
      update: pkg,
      create: pkg,
    });
  }
}

async function seedRecommendationSlots() {
  for (const slot of recommendationSlotData) {
    await prisma.recommendationSlot.upsert({
      where: { slot: slot.slot },
      update: {
        seriesIds: slot.seriesIds,
      },
      create: {
        slot: slot.slot,
        seriesIds: slot.seriesIds,
      },
    });
  }
}

async function seedInteractiveStories() {
  for (const story of interactiveStorySeeds) {
    const initialNode = story.nodes[0];
    await prisma.interactiveStory.upsert({
      where: { id: story.id },
      update: {
        seriesId: story.seriesId,
        slug: story.slug,
        title: story.title,
        description: story.description,
        baseContext: story.baseContext,
        initialNodeId: initialNode?.id || null,
        initialState: toInputJson(story.initialState),
        isPublished: true,
        aiEnabled: true,
      },
      create: {
        id: story.id,
        seriesId: story.seriesId,
        slug: story.slug,
        title: story.title,
        description: story.description,
        baseContext: story.baseContext,
        initialNodeId: initialNode?.id || null,
        initialState: toInputJson(story.initialState),
        isPublished: true,
        aiEnabled: true,
      },
    });

    for (const [nodeIndex, node] of story.nodes.entries()) {
      await prisma.interactiveStoryNode.upsert({
        where: {
          storyId_nodeKey: {
            storyId: story.id,
            nodeKey: node.key,
          },
        },
        update: {
          id: node.id,
          title: node.title,
          baseContext: node.fallbackText,
          basePrompt: node.basePrompt,
          fallbackText: node.fallbackText,
          requiredFlags: node.requiredFlags || [],
          blockedFlags: node.blockedFlags || [],
          stateEffects: toInputJson(node.stateEffects || {}),
          sortOrder: nodeIndex,
          isEnding: Boolean(node.isEnding),
          aiEnabled: true,
        },
        create: {
          id: node.id,
          storyId: story.id,
          nodeKey: node.key,
          title: node.title,
          baseContext: node.fallbackText,
          basePrompt: node.basePrompt,
          fallbackText: node.fallbackText,
          requiredFlags: node.requiredFlags || [],
          blockedFlags: node.blockedFlags || [],
          stateEffects: toInputJson(node.stateEffects || {}),
          sortOrder: nodeIndex,
          isEnding: Boolean(node.isEnding),
          aiEnabled: true,
        },
      });
    }

    for (const node of story.nodes) {
      for (const [choiceIndex, choice] of node.choices.entries()) {
        await prisma.interactiveStoryChoice.upsert({
          where: {
            nodeId_choiceKey: {
              nodeId: node.id,
              choiceKey: choice.key,
            },
          },
          update: {
            id: choice.id,
            targetNodeId: choice.targetNodeId,
            label: choice.label,
            description: null,
            requiredFlags: choice.requiredFlags || [],
            blockedFlags: choice.blockedFlags || [],
            stateEffects: toInputJson(choice.stateEffects || {}),
            sortOrder: choiceIndex,
          },
          create: {
            id: choice.id,
            nodeId: node.id,
            targetNodeId: choice.targetNodeId,
            choiceKey: choice.key,
            label: choice.label,
            description: null,
            requiredFlags: choice.requiredFlags || [],
            blockedFlags: choice.blockedFlags || [],
            stateEffects: toInputJson(choice.stateEffects || {}),
            sortOrder: choiceIndex,
          },
        });
      }
    }

    await prisma.interactiveStory.update({
      where: { id: story.id },
      data: {
        initialNodeId: initialNode?.id || null,
      },
    });

    console.log(`seeded interactive story ${story.id} (${story.title})`);
  }
}

async function main() {
  console.log("seeding backend fixtures...");
  await seedSeries();
  await seedEpisodes();
  await seedDemoSeries();
  await seedInteractiveStories();
  await seedRecommendationSlots();
  await seedTopupPackages();
  console.log("seed complete.");
}

main()
  .catch((error) => {
    console.error("seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
