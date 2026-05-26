import { createHash } from "crypto";
import {
  CreditRole,
  CreatorType,
  InteractiveContentMode,
  InteractiveUnlockPolicy,
  Prisma,
  PrismaClient,
} from "@prisma/client";
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

type InteractiveStorySeed = {
  id: string;
  seriesId: string | null;
  slug: string;
  title: string;
  description: string;
  baseContext: string;
  contentMode?: "NORMAL" | "ADULT";
  targetAudience?: string;
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
      description?: string;
      targetNodeId: string;
      unlockPolicy?:
        | "FREE"
        | "PREMIUM_ONLY"
        | "TOKENS_ONLY"
        | "PREMIUM_OR_TOKENS"
        | "PREMIUM_AND_TOKENS";
      requiresTokens?: number;
      unlockLabel?: string;
      stateEffects?: Record<string, unknown>;
      requiredFlags?: string[];
      blockedFlags?: string[];
    }>;
  }>;
};

function toInputJson(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function buildOfficialMockComicPageUrl(seriesId: string, pageNumber: number) {
  const normalizedSeriesId = String(seriesId || "").trim();
  const normalizedPageNumber =
    ((Math.max(1, Number(pageNumber || 1)) - 1) % 3) + 1;
  const approvedSeriesIds = new Set(["series-001", "series-010", "series-012"]);
  const assetBase = approvedSeriesIds.has(normalizedSeriesId)
    ? `/images/mock-comics/${normalizedSeriesId}`
    : "/images/mock-comics/default";
  return `${assetBase}/page-${normalizedPageNumber}.svg`;
}

function buildEpisodePages(
  series: Pick<SeriesSeed, "id" | "title" | "coverTone">,
  episodeNumber: number,
) {
  return [1, 2, 3].map((pageNumber) => ({
    url: buildOfficialMockComicPageUrl(series.id, pageNumber),
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
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
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
  return normalizeCreatorName(
    credits.find((credit) => credit.isPrimary)?.name || credits[0]?.name || "",
  );
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
    description:
      "An epic tale of warriors and kingdoms fighting for survival in a world on the brink of collapse.",
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
    description:
      "A talented musician falls in love with a mysterious woman who only appears at night.",
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
    description:
      "A cyber-spy thriller set in a near-future world where technology and humanity are at war.",
    episodePrice: 3,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [
      {
        name: "Nightglass Studio",
        role: CreditRole.STUDIO,
        type: CreatorType.STUDIO,
        isPrimary: true,
      },
    ],
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
    description:
      "A heartwarming story of first love and friendship at a high school known for its cherry blossoms.",
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
    description:
      "A young dragon tamer must fulfill an ancient oath to save the world from eternal darkness.",
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
    description:
      "A hardboiled detective navigates the seedy underbelly of a neon-lit cyberpunk city.",
    episodePrice: 2,
    ttfEnabled: true,
    ttfIntervalHours: 72,
    credits: [
      { name: "Cole Mercer", role: CreditRole.AUTHOR, isPrimary: true },
    ],
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
    description:
      "Life in a small coastal town gets complicated when a mysterious stranger arrives.",
    episodePrice: 2,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [
      { name: "Lena Brooks", role: CreditRole.AUTHOR, isPrimary: true },
    ],
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
    description:
      "A disgraced MMA champion fights his way back to the top against all odds.",
    episodePrice: 3,
    ttfEnabled: true,
    ttfIntervalHours: 24,
    credits: [
      {
        name: "Hammerline Team",
        role: CreditRole.TEAM,
        type: CreatorType.TEAM,
        isPrimary: true,
      },
    ],
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
    description:
      "At a magical academy for gifted students, a scholarship girl discovers she may be the chosen one.",
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
    description:
      "A vampire hunter discovers the line between monster and human is thinner than she thought.",
    episodePrice: 0,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [
      {
        name: "Rook Hollow Studio",
        role: CreditRole.STUDIO,
        type: CreatorType.STUDIO,
        isPrimary: true,
      },
    ],
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
    description:
      "A crew of misfits aboard a salvage ship uncovers an ancient alien conspiracy.",
    episodePrice: 2,
    ttfEnabled: true,
    ttfIntervalHours: 48,
    credits: [
      { name: "Tess Calder", role: CreditRole.AUTHOR, isPrimary: true },
      {
        name: "Orbital Forge Team",
        role: CreditRole.TEAM,
        type: CreatorType.TEAM,
      },
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
    description:
      "Two rivals must work together to survive the untamed frontier and resist their undeniable attraction.",
    episodePrice: 2,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [
      { name: "June Holloway", role: CreditRole.WRITER, isPrimary: true },
      { name: "Rafael Cruz", role: CreditRole.ARTIST },
    ],
  },
  {
    id: "series-013",
    title: "After Hours",
    type: "comic",
    adult: true,
    genres: ["Mature", "Drama", "Romance"],
    coverUrl: "/mock-covers/series-003.jpg",
    coverTone: "#3c0f2a",
    status: "Ongoing",
    description:
      "A restrained late-night workplace drama about ambition, blurred boundaries, and two adults trying to keep their private decisions from detonating the office.",
    episodePrice: 4,
    ttfEnabled: true,
    ttfIntervalHours: 24,
    credits: [
      { name: "Iris Vale", role: CreditRole.WRITER, isPrimary: true },
      {
        name: "Sable House Studio",
        role: CreditRole.STUDIO,
        type: CreatorType.STUDIO,
      },
    ],
  },
  {
    id: "series-014",
    title: "Velvet Alley",
    type: "novel",
    adult: true,
    genres: ["Mature", "Noir", "Thriller"],
    coverUrl: "/mock-covers/series-006.jpg",
    coverTone: "#221126",
    status: "Ongoing",
    description:
      "A city-noir serial about adult relationships, old debts, and the kind of secrets that only surface after midnight.",
    episodePrice: 3,
    ttfEnabled: true,
    ttfIntervalHours: 48,
    credits: [
      { name: "Maren Cross", role: CreditRole.AUTHOR, isPrimary: true },
    ],
  },
  {
    id: "series-015",
    title: "Glass Hearts",
    type: "comic",
    adult: true,
    genres: ["Mature", "Slice of Life", "Drama"],
    coverUrl: "/mock-covers/series-010.jpg",
    coverTone: "#4b1730",
    status: "Completed",
    description:
      "Three adults sharing one apartment discover that honesty, rent, and desire are a volatile mix when no one can afford to leave.",
    episodePrice: 2,
    ttfEnabled: false,
    ttfIntervalHours: 24,
    credits: [
      { name: "Nora Flint", role: CreditRole.WRITER, isPrimary: true },
      { name: "Jun Atelier", role: CreditRole.ARTIST },
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
    contentMode: "NORMAL",
    targetAudience: "US teens",
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
            description: "Reduce immediate risk and pull more signal data before the ship commits.",
            targetNodeId: "story-solar-wind-node-002",
            stateEffects: {
              trust: 1,
              clues: 1,
              risk: -1,
              flags: ["cautious_scan"],
            },
          },
          {
            id: "story-solar-wind-choice-002",
            key: "approach_beacon",
            label: "Approach the beacon at half thrust.",
            description: "Push toward the source before the unknown beacon goes silent again.",
            targetNodeId: "story-solar-wind-node-003",
            stateEffects: { risk: 2, clues: 1, flags: ["direct_approach"] },
          },
          {
            id: "story-solar-wind-choice-003",
            key: "wake_captain",
            label: "Wake the captain and hold position.",
            description: "Bring senior command in before the crew drifts deeper into the relay.",
            targetNodeId: "story-solar-wind-node-004",
            stateEffects: {
              affection: 1,
              trust: 1,
              risk: -1,
              flags: ["captain_alerted"],
            },
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
          'The captain arrives in silence, studies the telemetry, and hands command back to you with one line: "Make the call we can survive."',
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
            stateEffects: {
              affection: 1,
              risk: 1,
              flags: ["captain_backed_risk"],
            },
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
  {
    id: "story-locker-letter-001",
    seriesId: null,
    slug: "the-locker-letter",
    title: "The Locker Letter",
    description:
      "A teen mystery about a folded letter, a missing lunch break, and the one hallway rumor you probably should not trust.",
    contentMode: "NORMAL",
    targetAudience: "US teens",
    baseContext:
      "It is fifth period at Briar Hill High. You open your locker and a sealed letter drops into your hand with your name written in blue ink.",
    initialState: {
      trust: 0,
      clues: 0,
      courage: 0,
      flags: [],
    },
    nodes: [
      {
        id: "story-locker-letter-node-001",
        key: "locker_start",
        title: "A Letter in the Locker",
        fallbackText:
          "Between algebra and lunch, a folded letter slides out of your locker. It says to meet behind the auditorium before the final bell, and not to tell Maya.",
        basePrompt:
          "Write a sharp YA school mystery opening focused on tension, not melodrama.",
        choices: [
          {
            id: "story-locker-letter-choice-001",
            key: "show_maya",
            label: "Show the letter to Maya",
            description: "Trust your sharpest friend with the note before the rumor spreads further.",
            targetNodeId: "story-locker-letter-node-002",
            stateEffects: { trust: 1, flags: ["maya_in_loop"] },
          },
          {
            id: "story-locker-letter-choice-002",
            key: "inspect_letter",
            label: "Inspect the envelope alone",
            description: "Study the paper and ink yourself before anyone else can shape the story.",
            targetNodeId: "story-locker-letter-node-003",
            stateEffects: { clues: 1, flags: ["checked_handwriting"] },
          },
          {
            id: "story-locker-letter-choice-003",
            key: "follow_note_now",
            label: "Skip lunch and follow the note now",
            description: "Move first and test whether the warning is bait or a real plea for help.",
            targetNodeId: "story-locker-letter-node-004",
            stateEffects: { courage: 1, flags: ["went_early"] },
          },
        ],
      },
      {
        id: "story-locker-letter-node-002",
        key: "maya_reads_it",
        title: "Maya Reads First",
        fallbackText:
          "Maya reads the letter twice, then points out a cafeteria stamp on the back. She says whoever wrote it handled it near the vending machines after second period.",
        basePrompt:
          "Write a clue-forward scene with best-friend energy and clear stakes.",
        choices: [
          {
            id: "story-locker-letter-choice-004",
            key: "check_cafeteria",
            label: "Check the cafeteria trash bins",
            targetNodeId: "story-locker-letter-node-005",
            stateEffects: { clues: 1, flags: ["cafeteria_checked"] },
          },
          {
            id: "story-locker-letter-choice-005",
            key: "borrow_maya_pass",
            label: "Use Maya's hall pass route",
            targetNodeId: "story-locker-letter-node-006",
            unlockPolicy: "PREMIUM_ONLY",
            unlockLabel: "Members Only",
            stateEffects: { trust: 1, courage: 1, flags: ["premium_pass"] },
          },
        ],
      },
      {
        id: "story-locker-letter-node-003",
        key: "letter_marks",
        title: "Indent Marks",
        fallbackText:
          "Under the hallway light, the paper shows pressure marks from a previous page. You can barely make out the words stage door and 3:40.",
        basePrompt:
          "Write a detail-oriented clue scene with tactile paper evidence.",
        choices: [
          {
            id: "story-locker-letter-choice-006",
            key: "ask_stage_crew",
            label: "Ask the stage crew captain",
            targetNodeId: "story-locker-letter-node-005",
            stateEffects: { clues: 1, flags: ["crew_contact"] },
          },
          {
            id: "story-locker-letter-choice-007",
            key: "buy_print_token",
            label: "Print the indent scan in the library",
            targetNodeId: "story-locker-letter-node-007",
            unlockPolicy: "TOKENS_ONLY",
            requiresTokens: 15,
            unlockLabel: "Unlock for 15 Tokens",
            stateEffects: { clues: 2, flags: ["scan_printed"] },
          },
        ],
      },
      {
        id: "story-locker-letter-node-004",
        key: "behind_auditorium_early",
        title: "Too Early Behind the Auditorium",
        fallbackText:
          "You reach the service path early enough to hear two students arguing through the prop shed wall. One of them says the letter was only supposed to scare you.",
        basePrompt:
          "Write an eavesdropping scene that reveals motive without fully solving the mystery.",
        choices: [
          {
            id: "story-locker-letter-choice-008",
            key: "step_out_now",
            label: "Step out and confront them",
            targetNodeId: "story-locker-letter-node-008",
            stateEffects: { courage: 1, flags: ["direct_confrontation"] },
          },
          {
            id: "story-locker-letter-choice-009",
            key: "record_names",
            label: "Stay hidden and catch the names",
            targetNodeId: "story-locker-letter-node-007",
            stateEffects: { clues: 1, flags: ["heard_names"] },
          },
        ],
      },
      {
        id: "story-locker-letter-node-005",
        key: "cafeteria_receipt",
        title: "Receipt Under the Machine",
        fallbackText:
          "A crumpled snack receipt under the vending machine has the exact time stamp Maya guessed. On the back is the first half of another note in the same blue ink.",
        basePrompt:
          "Write a mid-story discovery that points toward a human motive rather than a grand conspiracy.",
        choices: [
          {
            id: "story-locker-letter-choice-010",
            key: "meet_sender_calmly",
            label: "Take the new note and meet the sender calmly",
            targetNodeId: "story-locker-letter-node-009",
            stateEffects: { trust: 1, clues: 1, flags: ["calm_meet"] },
          },
          {
            id: "story-locker-letter-choice-011",
            key: "report_to_counselor",
            label: "Bring everything to the counselor first",
            targetNodeId: "story-locker-letter-node-010",
            stateEffects: { clues: 1, flags: ["adult_help"] },
          },
        ],
      },
      {
        id: "story-locker-letter-node-006",
        key: "premium_rooftop_view",
        title: "The Rooftop Hall Pass",
        fallbackText:
          "The premium route gets you above the courtyard with a clear view of the stage door. You spot Rowan passing something small to the stage crew captain before the bell.",
        basePrompt:
          "Write a clean premium branch that delivers sharper observation, not darker content.",
        choices: [
          {
            id: "story-locker-letter-choice-012",
            key: "follow_rowan",
            label: "Follow Rowan after the bell",
            targetNodeId: "story-locker-letter-node-009",
            stateEffects: { clues: 2, flags: ["rowan_seen"] },
          },
          {
            id: "story-locker-letter-choice-013",
            key: "tell_maya_everything",
            label: "Tell Maya everything before class ends",
            targetNodeId: "story-locker-letter-node-010",
            stateEffects: { trust: 2, flags: ["full_confession"] },
          },
        ],
      },
      {
        id: "story-locker-letter-node-007",
        key: "names_on_record",
        title: "The Names Line Up",
        fallbackText:
          "The clues converge on Rowan and Tessa, but not for the reason you expected. The letter was part apology, part confession, and it was never supposed to become hallway theater.",
        basePrompt:
          "Write a reveal node that makes teen emotions legible and grounded.",
        choices: [
          {
            id: "story-locker-letter-choice-014",
            key: "go_to_stage_door",
            label: "Go to the stage door anyway",
            targetNodeId: "story-locker-letter-node-009",
            stateEffects: { courage: 1, flags: ["went_to_door"] },
          },
          {
            id: "story-locker-letter-choice-015",
            key: "cool_it_down",
            label: "Defuse the rumor before the meeting",
            targetNodeId: "story-locker-letter-node-010",
            stateEffects: { trust: 1, flags: ["rumor_defused"] },
          },
        ],
      },
      {
        id: "story-locker-letter-node-008",
        key: "caught_listening",
        title: "Caught Listening",
        fallbackText:
          "Your shoes scrape the pavement and both voices cut off. One student bolts. The other turns around with the same blue pen clipped to their hoodie pocket.",
        basePrompt:
          "Write a confrontation that pivots quickly into emotional clarity.",
        choices: [
          {
            id: "story-locker-letter-choice-016",
            key: "hear_them_out",
            label: "Hear them out",
            targetNodeId: "story-locker-letter-node-009",
            stateEffects: { trust: 1, flags: ["heard_them_out"] },
          },
          {
            id: "story-locker-letter-choice-017",
            key: "walk_away_clean",
            label: "Walk away and end the rumor",
            targetNodeId: "story-locker-letter-node-010",
            stateEffects: { courage: 1, flags: ["walked_away"] },
          },
        ],
      },
      {
        id: "story-locker-letter-node-009",
        key: "ending_stage_door",
        title: "Ending: Stage Door Truth",
        fallbackText:
          "Behind the stage door, the truth comes out: the letter was meant to confess a stolen audition file and ask for your help returning it before anyone else got blamed. You choose honesty, and the rumor dies before it can harden into something worse.",
        basePrompt:
          "Write a satisfying teen-safe ending where honesty resolves the main conflict.",
        isEnding: true,
        choices: [],
      },
      {
        id: "story-locker-letter-node-010",
        key: "ending_hallway_reset",
        title: "Ending: Hallway Reset",
        fallbackText:
          "You never get the full dramatic confession, but you do stop the damage. By the final bell, the note is no longer a weapon, just a clumsy mistake between students who needed to talk like actual people.",
        basePrompt:
          "Write a softer ending focused on harm reduction and emotional maturity.",
        isEnding: true,
        choices: [],
      },
    ],
  },
];

function deriveSeedChoiceCommerce(choice: InteractiveStorySeed["nodes"][number]["choices"][number]) {
  const unlockPolicy = String(choice.unlockPolicy || "FREE").trim().toUpperCase();
  const requiresTokens = Math.max(0, Number(choice.requiresTokens || 0));
  const requiresPremium =
    unlockPolicy === "PREMIUM_ONLY" ||
    unlockPolicy === "PREMIUM_OR_TOKENS" ||
    unlockPolicy === "PREMIUM_AND_TOKENS";
  return {
    unlockPolicy,
    requiresPremium,
    requiresTokens:
      unlockPolicy === "TOKENS_ONLY" ||
      unlockPolicy === "PREMIUM_OR_TOKENS" ||
      unlockPolicy === "PREMIUM_AND_TOKENS"
        ? requiresTokens
        : 0,
    unlockLabel: choice.unlockLabel || null,
  };
}

function buildPublishedSnapshotForSeed(story: InteractiveStorySeed) {
  return {
    story: {
      id: story.id,
      slug: story.slug,
      title: story.title,
      description: story.description,
      baseContext: story.baseContext,
      contentMode: story.contentMode || "NORMAL",
      targetAudience: story.targetAudience || "US teens",
      seriesId: story.seriesId,
      initialNodeId: story.nodes[0]?.id || null,
      initialState: story.initialState,
      publishedVersion: 1,
      publishedAt: new Date().toISOString(),
    },
    series: story.seriesId
      ? {
          id: story.seriesId,
          title:
            seriesData.find((series) => series.id === story.seriesId)?.title || story.title,
          adult: Boolean(
            seriesData.find((series) => series.id === story.seriesId)?.adult,
          ),
          coverUrl:
            seriesData.find((series) => series.id === story.seriesId)?.coverUrl || null,
          genres:
            seriesData.find((series) => series.id === story.seriesId)?.genres || [],
        }
      : null,
    nodes: story.nodes.map((node, nodeIndex) => ({
      id: node.id,
      storyId: story.id,
      nodeKey: node.key,
      title: node.title,
      baseContext: node.fallbackText,
      basePrompt: node.basePrompt,
      fallbackText: node.fallbackText,
      generatedByAI: false,
      reviewStatus: "approved",
      editorNotes: null,
      requiredFlags: node.requiredFlags || [],
      blockedFlags: node.blockedFlags || [],
      stateEffects: node.stateEffects || {},
      sortOrder: nodeIndex,
      isEnding: Boolean(node.isEnding),
      aiEnabled: true,
      choices: (node.choices || []).map((choice, choiceIndex) => ({
        id: choice.id,
        nodeId: node.id,
        targetNodeId: choice.targetNodeId,
        choiceKey: choice.key,
        label: choice.label,
        description: null,
        ...deriveSeedChoiceCommerce(choice),
        requiredFlags: choice.requiredFlags || [],
        blockedFlags: choice.blockedFlags || [],
        stateEffects: choice.stateEffects || {},
        sortOrder: choiceIndex,
      })),
    })),
  };
}

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
        id: createStableId(
          "credit",
          `${series.id}:${creatorId}:${credit.role}`,
        ),
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
      const releasedAt = new Date(
        Date.now() - (episodeCount - number) * 7 * 24 * 60 * 60 * 1000,
      );
      const pricePts = number === 1 ? 0 : series.episodePrice;
      const novelParagraphs =
        series.type === "novel"
          ? buildNovelParagraphs(series.title, number)
          : [];

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
            ? new Date(
                releasedAt.getTime() + series.ttfIntervalHours * 60 * 60 * 1000,
              )
            : null,
          previewFreePages: series.type === "comic" ? 3 : 0,
          pages:
            series.type === "comic" ? buildEpisodePages(series, number) : [],
          paragraphs: novelParagraphs,
          text:
            novelParagraphs.length > 0 ? novelParagraphs.join("\n\n") : null,
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
            ? new Date(
                releasedAt.getTime() + series.ttfIntervalHours * 60 * 60 * 1000,
              )
            : null,
          previewFreePages: series.type === "comic" ? 3 : 0,
          pages:
            series.type === "comic" ? buildEpisodePages(series, number) : [],
          paragraphs: novelParagraphs,
          text:
            novelParagraphs.length > 0 ? novelParagraphs.join("\n\n") : null,
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
    const storyContentMode =
      story.contentMode === "ADULT"
        ? InteractiveContentMode.ADULT
        : InteractiveContentMode.NORMAL;
    await prisma.interactiveStory.upsert({
      where: { id: story.id },
      update: {
        seriesId: story.seriesId,
        slug: story.slug,
        title: story.title,
        description: story.description,
        baseContext: story.baseContext,
        contentMode: storyContentMode,
        targetAudience: story.targetAudience || "US teens",
        initialNodeId: initialNode?.id || null,
        initialState: toInputJson(story.initialState),
        isPublished: true,
        publishedVersion: 1,
        publishedAt: new Date(),
        aiEnabled: true,
      },
      create: {
        id: story.id,
        seriesId: story.seriesId || null,
        slug: story.slug,
        title: story.title,
        description: story.description,
        baseContext: story.baseContext,
        contentMode: storyContentMode,
        targetAudience: story.targetAudience || "US teens",
        initialNodeId: initialNode?.id || null,
        initialState: toInputJson(story.initialState),
        isPublished: true,
        publishedVersion: 1,
        publishedAt: new Date(),
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
        const choiceCommerce = deriveSeedChoiceCommerce(choice);
        const unlockPolicy =
          InteractiveUnlockPolicy[
            choiceCommerce.unlockPolicy as keyof typeof InteractiveUnlockPolicy
          ];
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
            description: choice.description || null,
            unlockPolicy,
            requiresPremium: choiceCommerce.requiresPremium,
            requiresTokens: choiceCommerce.requiresTokens,
            unlockLabel: choiceCommerce.unlockLabel,
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
            description: choice.description || null,
            unlockPolicy,
            requiresPremium: choiceCommerce.requiresPremium,
            requiresTokens: choiceCommerce.requiresTokens,
            unlockLabel: choiceCommerce.unlockLabel,
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
        publishedVersion: 1,
        publishedAt: new Date(),
      },
    });

    const snapshotPayload = buildPublishedSnapshotForSeed(story);
    await prisma.interactiveStoryPublishedSnapshot.updateMany({
      where: { storyId: story.id, isActive: true },
      data: { isActive: false },
    });
    await prisma.interactiveStoryPublishedSnapshot.upsert({
      where: {
        storyId_version: {
          storyId: story.id,
          version: 1,
        },
      },
      update: {
        snapshotJson: snapshotPayload as Prisma.InputJsonValue,
        checksum: createHash("sha256")
          .update(JSON.stringify(snapshotPayload))
          .digest("hex"),
        publishedAt: new Date(),
        isActive: true,
      },
      create: {
        storyId: story.id,
        version: 1,
        snapshotJson: snapshotPayload as Prisma.InputJsonValue,
        checksum: createHash("sha256")
          .update(JSON.stringify(snapshotPayload))
          .digest("hex"),
        publishedAt: new Date(),
        isActive: true,
      },
    });

    console.log(`seeded interactive story ${story.id} (${story.title})`);
  }
}

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PROD_SEED !== "1"
  ) {
    console.error(
      [
        "Refusing to run full seed in production without explicit override.",
        "If you truly intend to seed a production database, set ALLOW_PROD_SEED=1 and rerun.",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log("seeding backend catalog...");
  await seedSeries();
  await seedEpisodes();
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
