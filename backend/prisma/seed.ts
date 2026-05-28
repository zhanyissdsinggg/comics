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
  const normalizedTitle = String(seriesTitle || "").trim().toLowerCase();

  if (normalizedTitle === "neon nights") {
    const episodes: Record<number, string[]> = {
      1: [
        "The rain started at 2:11 a.m., thin as cassette tape and silver under the mag-rail. Aya kept one hand on the courier bike and the other over the paper envelope tucked inside her jacket, because nobody paid cash in Helix City unless the message mattered more than the law.",
        "Neon leaked across the flooded avenue in bruised pink and aquarium blue. Clubs were closing. Street kitchens were waking. Somewhere above the stacked apartments, a singer named Iona Vale had vanished between one encore and the blackout that swallowed three blocks of the Old Loop.",
        "Aya was supposed to deliver the envelope, take the credits, and keep moving. Instead she saw Iona's face on every emergency screen at once, frozen mid-note beneath the words MISSING AFTER INCIDENT AT THE GLASS ARCADE.",
        "At the next red light she checked the seal on the envelope. No address on the front. No sender. Only a hand-drawn crescent in silver ink, the same mark painted on the backstage door Iona had walked through an hour before she disappeared.",
        "By the time the signal turned green, Aya had already made the bad decision. She veered off the delivery lane, aimed the bike toward the Arcade district, and told herself she was only looking for a faster route. The lie bought her half a block.",
      ],
      2: [
        "The Glass Arcade smelled like ozone, expensive perfume, and old panic. Cleanup drones skated across the marble floor, polishing around a scorch mark shaped almost exactly like a body that had fallen and then been erased.",
        "A stagehand in a mirrored raincoat blocked Aya with a mop handle. He had bloodshot eyes and glitter still clinging to one cheek. 'If you're press, turn around,' he said. 'If you're police, you're late.'",
        "Aya showed him the envelope instead. The silver crescent changed his face more effectively than a weapon. He lowered the mop, glanced toward the silent stage, and whispered, 'Then she chose you too.'",
        "Behind the curtains the microphones were dead, but one dressing-room speaker kept humming with a low, stubborn feedback note. Under it, almost too soft to hear, Iona's rehearsal track replayed the final line she had sung before the blackout: find the door behind the wrong applause.",
        "Aya followed the sound to a mirrored wall that reflected the room correctly except for one missing detail. Her own jacket was there. The envelope was not. When she pressed the glass, a seam appeared in the silver and cold air breathed out from the dark.",
      ],
      3: [
        "The hidden stairwell dropped beneath the club and into the service arteries of the district, where the city's glamour gave way to humming pipes and cables wrapped in warning tape. Aya counted three levels before she saw the first speaker wired into the concrete like a shrine.",
        "Every speaker played a different fragment of Iona's voice. A laugh. A breath. One unfinished verse. Stitched together, they became a map, guiding her deeper until the corridor opened onto a rehearsal room no public blueprint admitted existed.",
        "Iona was there, alive, barefoot, and furious, standing beneath a rig of illegal resonance tech that could copy a singer's voice into a thousand synthetic ghosts. 'You should have delivered the envelope and walked away,' she said, though relief broke through the words a second later.",
        "Aya handed over the message. Inside was a single room key and a time: 3:40. Iona read it once and swore softly. 'They're not hiding me,' she said. 'They're preparing to debut me without me.'",
        "Above them, the club speakers roared back to life for the second show of the night. Iona looked up, heard her own voice being performed by machines, and reached for Aya's hand. 'If we miss that room before 3:40,' she said, 'the city will never know which version of me survived.'",
      ],
    };

    if (episodes[episodeNumber]) {
      return episodes[episodeNumber];
    }
  }

  if (normalizedTitle === "solar wind") {
    const episodes: Record<number, string[]> = {
      1: [
        "The first warning came as a color, not a sound. A pale ribbon of gold moved across the cockpit glass and painted the crew of the Solar Wind in a sunrise that belonged to no nearby star.",
        "Lena Ortiz had been on relay duty for eleven straight hours, nursing a freighter-class salvage ship through a dead corridor of satellites and forgotten military junk. She almost logged the glow as sensor drift until every loose screw in the console began to hum in the same key.",
        "Outside, the storm front unfurled over the station ring like a banner on fire. Charged dust scraped against the hull. Navigation buoys blinked out one by one. Somewhere in the static, a buried distress signal woke up and started repeating a call sign older than the charts.",
        "Captain Vale ordered the crew to keep course and leave the ghost transmission alone. The city below needed the reactor cores in their hold before dawn. But Lena watched the signal lock onto their ship, tighten, and pulse back in perfect rhythm with her own heartbeat.",
        "She answered it with one stolen touch on the console. The bridge lights went dark. In the black glass, a second ship appeared beside the Solar Wind, impossible and silent, keeping pace where there should have been only storm.",
      ],
      2: [
        "Emergency lamps snapped on in strips of red, turning the bridge into a submarine of shadows. Behind Lena, engineer Micah cursed from the ladder well and shouted that the guidance spool had rebooted itself with coordinates nobody had entered.",
        "The phantom ship remained on the glass, not on the scanners. It was visible only when the storm flashed. Each time lightning licked through the dust, another detail appeared: a broken antenna, scorched plating, a name along the bow sanded away by time.",
        "Captain Vale wanted the crew strapped down and silent. Lena wanted to know why a distress call from a vanished patrol ship knew the Solar Wind by registry number. When the same signal pushed a burst of code through the dead comm array, curiosity won.",
        "The decoded packet was only three words long: DO NOT DOCK BELOW. Nothing else. No source stamp. No timestamp. Just the kind of warning that arrives too late to be comforting.",
        "Then the city station answered the storm with a docking clearance they had never requested. Bay Seven opened like a mouth beneath them, bright, welcoming, and very obviously powered by a grid that should have failed ten years ago.",
      ],
      3: [
        "The Solar Wind settled into Bay Seven on magnetic clamps that hit too hard, as if the station were afraid they might change their minds. No harbor crew came out to meet them. No customs drones. Only clean white lights and a corridor so polished it reflected the ship like a confession.",
        "Micah found frost on the inside of the cargo hatch. Captain Vale found the station clock frozen at 04:17, the exact minute the ghost distress call had first gone dark in the archives. Lena found footprints in the docking dust leading away from their ramp before anyone on her crew had stepped outside.",
        "They followed the prints into the station market, past sealed stalls and tables still set for meals that had never been eaten. Every screen in the concourse showed the same public service notice in six languages: SHELTER IN PLACE UNTIL THE FLARE PASSES.",
        "At the center rotunda, a boy in an oversized station coat waited beside a maintenance cart, as though he had been told precisely when they would arrive. He looked at Lena, then at the sealed reactor cores in the cargo manifest, and said, 'You took too long. The city has already chosen who goes dark first.'",
        "Before anyone could question him, the floor beneath the rotunda lights flickered transparent. Far below the station's polished streets, another city hung upside down in the storm, hidden in the superstructure like a second heart.",
      ],
    };

    if (episodes[episodeNumber]) {
      return episodes[episodeNumber];
    }
  }

  return [
    `Night pressed close around ${seriesTitle}, and Episode ${episodeNumber} opened on a choice that already felt one second too late.`,
    "The first turn landed fast, pulling the character forward before fear had time to dress itself up as caution.",
    "Details from the setting kept the danger physical, immediate, and impossible to explain away.",
    "By the final beat, the chapter left the kind of hook that made the next page feel necessary.",
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
            description: "Caution route — Scan first and reduce immediate risk.",
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
            description: "Risk route — Close the distance before the signal disappears.",
            targetNodeId: "story-solar-wind-node-003",
            stateEffects: { risk: 2, clues: 1, flags: ["direct_approach"] },
          },
          {
            id: "story-solar-wind-choice-003",
            key: "wake_captain",
            label: "Wake the captain and hold position.",
            description: "Leadership route — Wake the captain before the crew commits.",
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
            description: "Trust route — Maya may notice something you missed.",
            targetNodeId: "story-locker-letter-node-002",
            stateEffects: { trust: 1, flags: ["maya_in_loop"] },
          },
          {
            id: "story-locker-letter-choice-002",
            key: "inspect_letter",
            label: "Inspect the envelope alone",
            description: "Mystery route — Look for clues before anyone else sees it.",
            targetNodeId: "story-locker-letter-node-003",
            stateEffects: { clues: 1, flags: ["checked_handwriting"] },
          },
          {
            id: "story-locker-letter-choice-003",
            key: "follow_note_now",
            label: "Skip lunch and follow the note now",
            description: "Risk route — Move fast, but you may lose backup.",
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
            key: "premium_indent_scan",
            label: "Use the library media room to scan the page",
            targetNodeId: "story-locker-letter-node-007",
            unlockPolicy: "PREMIUM_ONLY",
            unlockLabel: "Members Only",
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
  {
    id: "story-last-bus-home-001",
    seriesId: null,
    slug: "last-bus-home",
    title: "Last Bus Home",
    description:
      "A midnight bus ride goes wrong when one missing text turns into a citywide rumor, a dead route, and two very different endings.",
    contentMode: "NORMAL",
    targetAudience: "US teens",
    baseContext:
      "At 12:11 a.m., the last bus pulls up almost empty, and your best friend sends one message before it disappears: do not let me get off alone.",
    initialState: {
      trust: 0,
      courage: 0,
      clues: 0,
      flags: [],
    },
    nodes: [
      {
        id: "story-last-bus-home-node-001",
        key: "midnight_stop",
        title: "The Last Bus Pulls In",
        fallbackText:
          "The bus doors sigh open under the broken shelter light. Your best friend Rowan is nowhere in sight, but the phone screen in your hand still glows with that last message: do not let me get off alone.",
        basePrompt:
          "Write a sharp YA opening with instant urgency, clean visual detail, and a clear hook.",
        choices: [
          {
            id: "story-last-bus-home-choice-001",
            key: "board_now",
            label: "Get on the bus before it leaves.",
            description: "Fast route. Stay close to whatever Rowan saw.",
            targetNodeId: "story-last-bus-home-node-002",
            stateEffects: { courage: 1, flags: ["boarded_bus"] },
          },
          {
            id: "story-last-bus-home-choice-002",
            key: "call_rowan",
            label: "Call Rowan again from the curb.",
            description: "Trust route. Listen before you run.",
            targetNodeId: "story-last-bus-home-node-003",
            stateEffects: { trust: 1, flags: ["called_rowan"] },
          },
          {
            id: "story-last-bus-home-choice-003",
            key: "check_camera",
            label: "Check the stop camera reflection in the ad glass.",
            description: "Clue route. Look for who was here first.",
            targetNodeId: "story-last-bus-home-node-004",
            stateEffects: { clues: 1, flags: ["checked_camera_glass"] },
          },
        ],
      },
      {
        id: "story-last-bus-home-node-002",
        key: "empty_bus",
        title: "Too Empty to Feel Safe",
        fallbackText:
          "Inside, the bus is almost silent except for the rattle of the back window and one guy in a football jacket pretending not to watch you. Two seats up, Rowan's silver keychain hangs from the rail like they dropped it on purpose.",
        basePrompt:
          "Write a claustrophobic transit scene that keeps the threat believable and teen-readable.",
        choices: [
          {
            id: "story-last-bus-home-choice-004",
            key: "sit_by_keychain",
            label: "Take the seat by Rowan's keychain.",
            targetNodeId: "story-last-bus-home-node-005",
            stateEffects: { clues: 1, flags: ["found_keychain"] },
          },
          {
            id: "story-last-bus-home-choice-005",
            key: "watch_driver",
            label: "Stay near the driver and watch the mirror.",
            targetNodeId: "story-last-bus-home-node-006",
            stateEffects: { trust: 1, flags: ["watched_driver"] },
          },
        ],
      },
      {
        id: "story-last-bus-home-node-003",
        key: "voice_mail",
        title: "A Voice Mail That Wasn't Finished",
        fallbackText:
          "Rowan does not answer, but a voice mail starts playing by itself. You catch bus brakes, somebody saying service tunnel, and Rowan whispering your name like they were trying not to be heard.",
        basePrompt:
          "Write a suspense beat around an incomplete voice mail with specific, usable clues.",
        choices: [
          {
            id: "story-last-bus-home-choice-006",
            key: "follow_tunnel",
            label: "Head for the service tunnel under the station.",
            targetNodeId: "story-last-bus-home-node-007",
            stateEffects: { courage: 1, clues: 1, flags: ["tunnel_route"] },
          },
          {
            id: "story-last-bus-home-choice-007",
            key: "text_brother",
            label: "Text your older brother to meet you there.",
            targetNodeId: "story-last-bus-home-node-006",
            unlockPolicy: "PREMIUM_ONLY",
            unlockLabel: "Premium Route",
            stateEffects: { trust: 1, courage: 1, flags: ["backup_called"] },
          },
        ],
      },
      {
        id: "story-last-bus-home-node-004",
        key: "glass_reflection",
        title: "Something in the Glass",
        fallbackText:
          "The ad glass shows more than the street behind you. In the reflection, Rowan is on the bus already, standing in the back with someone else's hoodie pulled over their head like they don't want the driver to know they're there.",
        basePrompt:
          "Write a hooky reveal scene built around a reflection and a split-second decision.",
        choices: [
          {
            id: "story-last-bus-home-choice-008",
            key: "bang_on_door",
            label: "Bang on the bus door and make the driver stop.",
            targetNodeId: "story-last-bus-home-node-005",
            stateEffects: { courage: 1, flags: ["forced_stop"] },
          },
          {
            id: "story-last-bus-home-choice-009",
            key: "follow_in_bike_lane",
            label: "Cut through the bike lane and beat it to the depot.",
            targetNodeId: "story-last-bus-home-node-007",
            stateEffects: { clues: 1, flags: ["raced_to_depot"] },
          },
        ],
      },
      {
        id: "story-last-bus-home-node-005",
        key: "depot_drop",
        title: "The Wrong Depot",
        fallbackText:
          "The bus rolls past the regular line and into an out-of-service depot lit by one sodium lamp. Rowan is there after all, but they are not trapped. They are waiting for you to choose whether to blow up a lie or protect the person who started it.",
        basePrompt:
          "Write a reveal node where danger shifts into social stakes without losing momentum.",
        choices: [
          {
            id: "story-last-bus-home-choice-010",
            key: "go_public",
            label: "Tell the driver and call the police line.",
            targetNodeId: "story-last-bus-home-node-008",
            stateEffects: { courage: 1, flags: ["went_public"] },
          },
          {
            id: "story-last-bus-home-choice-011",
            key: "hear_rowan_out",
            label: "Hear Rowan out before anyone else steps in.",
            targetNodeId: "story-last-bus-home-node-009",
            stateEffects: { trust: 2, flags: ["heard_rowan"] },
          },
        ],
      },
      {
        id: "story-last-bus-home-node-006",
        key: "river_platform",
        title: "The River Platform",
        fallbackText:
          "The clue trail sends you to the closed platform by the river where Rowan finally answers. They say they staged the disappearance to catch the senior who had been using fake emergency calls to scare freshmen off the late route.",
        basePrompt:
          "Write a confession scene with social stakes, not melodrama, and keep the tension active.",
        choices: [
          {
            id: "story-last-bus-home-choice-012",
            key: "back_rowan_plan",
            label: "Back Rowan's plan and help expose it cleanly.",
            targetNodeId: "story-last-bus-home-node-009",
            stateEffects: { trust: 1, clues: 1, flags: ["backed_plan"] },
          },
          {
            id: "story-last-bus-home-choice-013",
            key: "shut_it_down",
            label: "Shut it down before someone else gets dragged in.",
            targetNodeId: "story-last-bus-home-node-008",
            stateEffects: { courage: 1, flags: ["stopped_plan"] },
          },
        ],
      },
      {
        id: "story-last-bus-home-node-007",
        key: "service_tunnel",
        title: "Under the Station",
        fallbackText:
          "The service tunnel smells like rainwater and old brake dust. Rowan has left arrows in chalk on the wall, and every one of them points to the same fact: this wasn't a kidnapping. It was bait.",
        basePrompt:
          "Write a fast-moving tunnel scene that turns fear into a bigger mystery.",
        choices: [
          {
            id: "story-last-bus-home-choice-014",
            key: "follow_chalk",
            label: "Follow the chalk trail to Rowan.",
            targetNodeId: "story-last-bus-home-node-009",
            stateEffects: { clues: 1, trust: 1, flags: ["followed_chalk"] },
          },
          {
            id: "story-last-bus-home-choice-015",
            key: "pull_alarm",
            label: "Pull the emergency alarm and flood the tunnel with adults.",
            targetNodeId: "story-last-bus-home-node-008",
            stateEffects: { courage: 1, flags: ["pulled_alarm"] },
          },
        ],
      },
      {
        id: "story-last-bus-home-node-008",
        key: "ending_clean_break",
        title: "Ending: Clean Break",
        fallbackText:
          "You stop the stunt before it spreads. The late-route rumor dies, the senior behind the scare campaign gets named, and Rowan has to live with being angry at you and grateful at the same time.",
        basePrompt:
          "Write a strong YA ending where choosing safety costs something but still feels right.",
        isEnding: true,
        choices: [],
      },
      {
        id: "story-last-bus-home-node-009",
        key: "ending_keep_the_line_open",
        title: "Ending: Keep the Line Open",
        fallbackText:
          "You stay with Rowan long enough to finish what they started. By sunrise the fake emergency calls are exposed, the route is safe again, and the two of you are left with the kind of trust that only survives a terrible idea once.",
        basePrompt:
          "Write a satisfying ending built on trust, cleanup, and one final emotional beat.",
        isEnding: true,
        choices: [],
      },
    ],
  },
  {
    id: "story-group-chat-leak-001",
    seriesId: null,
    slug: "the-group-chat-leak",
    title: "The Group Chat Leak",
    description:
      "A private screenshot hits the school group chat at 11:47 p.m., and by midnight you have to decide whether to clear your name or protect the person who set you up.",
    contentMode: "NORMAL",
    targetAudience: "US teens",
    baseContext:
      "At 11:47 p.m., your class group chat lights up with a screenshot of a message you never sent, and your phone starts vibrating like the whole school is standing outside your door.",
    initialState: {
      trust: 0,
      clues: 0,
      courage: 0,
      flags: [],
    },
    nodes: [
      {
        id: "story-group-chat-leak-node-001",
        key: "screenshot_drop",
        title: "The Screenshot Lands",
        fallbackText:
          "The screenshot is ugly, specific, and fake in exactly the way that makes people believe it faster. Three dots bloom in six different chats before you can even decide whether to defend yourself or disappear.",
        basePrompt:
          "Write a modern YA opening with digital urgency and immediate social stakes.",
        choices: [
          {
            id: "story-group-chat-leak-choice-001",
            key: "call_best_friend",
            label: "Call your best friend first.",
            targetNodeId: "story-group-chat-leak-node-002",
            stateEffects: { trust: 1, flags: ["friend_called"] },
          },
          {
            id: "story-group-chat-leak-choice-002",
            key: "inspect_metadata",
            label: "Check the screenshot for editing mistakes.",
            targetNodeId: "story-group-chat-leak-node-003",
            stateEffects: { clues: 1, flags: ["metadata_checked"] },
          },
          {
            id: "story-group-chat-leak-choice-003",
            key: "go_quiet",
            label: "Go quiet and watch who pushes it hardest.",
            targetNodeId: "story-group-chat-leak-node-004",
            stateEffects: { courage: 1, flags: ["stayed_quiet"] },
          },
        ],
      },
      {
        id: "story-group-chat-leak-node-002",
        key: "best_friend_angle",
        title: "The One Person Who Knows Your Typing Style",
        fallbackText:
          "Your best friend Iris answers on the first ring and says the fake message is almost convincing, except for one thing: whoever forged it copied your punctuation but not your panic. She thinks the leak came from someone close enough to imitate you badly.",
        basePrompt:
          "Write a friendship scene that turns comfort into a credible clue.",
        choices: [
          {
            id: "story-group-chat-leak-choice-004",
            key: "check_shared_drive",
            label: "Check the shared debate-team drive.",
            targetNodeId: "story-group-chat-leak-node-005",
            stateEffects: { clues: 1, flags: ["debate_drive"] },
          },
          {
            id: "story-group-chat-leak-choice-005",
            key: "meet_iris_now",
            label: "Meet Iris outside the library tonight.",
            targetNodeId: "story-group-chat-leak-node-006",
            stateEffects: { trust: 1, courage: 1, flags: ["met_iris"] },
          },
        ],
      },
      {
        id: "story-group-chat-leak-node-003",
        key: "metadata_crack",
        title: "A Tiny Editing Error",
        fallbackText:
          "The screenshot metadata shows it was cropped twice, once on school wifi and once from a phone with low-power mode on. That narrows it down to somebody who was in the journalism room after the game and nervous enough to rush.",
        basePrompt:
          "Write a clue scene around phone metadata that still feels dramatic.",
        choices: [
          {
            id: "story-group-chat-leak-choice-006",
            key: "check_journalism_room",
            label: "Go to the journalism room before janitorial lockup.",
            targetNodeId: "story-group-chat-leak-node-005",
            stateEffects: { clues: 1, flags: ["journalism_room"] },
          },
          {
            id: "story-group-chat-leak-choice-007",
            key: "post_one_reply",
            label: "Post one calm reply and see who panics.",
            targetNodeId: "story-group-chat-leak-node-007",
            stateEffects: { courage: 1, flags: ["posted_reply"] },
          },
        ],
      },
      {
        id: "story-group-chat-leak-node-004",
        key: "silence_strategy",
        title: "Silence Makes People Loud",
        fallbackText:
          "You stay quiet for eight brutal minutes and learn more than you wanted. One classmate keeps repeating the screenshot like they need the story to stay alive, and another privately sends you a location pin for the old rooftop greenhouse.",
        basePrompt:
          "Write a tense social-media beat where silence reveals motive.",
        choices: [
          {
            id: "story-group-chat-leak-choice-008",
            key: "take_rooftop_pin",
            label: "Follow the rooftop pin.",
            targetNodeId: "story-group-chat-leak-node-006",
            stateEffects: { courage: 1, clues: 1, flags: ["rooftop_pin"] },
          },
          {
            id: "story-group-chat-leak-choice-009",
            key: "screen_record_chat",
            label: "Screen-record the chat before messages vanish.",
            targetNodeId: "story-group-chat-leak-node-007",
            stateEffects: { clues: 1, flags: ["chat_recorded"] },
          },
        ],
      },
      {
        id: "story-group-chat-leak-node-005",
        key: "drive_receipts",
        title: "Receipts in the Shared Drive",
        fallbackText:
          "Inside the shared drive is a deleted draft with your name in the file history and somebody else's login attached to the last edit. The fake screenshot was not random. It was supposed to wreck tomorrow's student panel before you could speak.",
        basePrompt:
          "Write a reveal scene that keeps the stakes grounded in school politics and betrayal.",
        choices: [
          {
            id: "story-group-chat-leak-choice-010",
            key: "name_them_tonight",
            label: "Drop the receipts into the group chat tonight.",
            targetNodeId: "story-group-chat-leak-node-008",
            stateEffects: { courage: 1, flags: ["receipts_dropped"] },
          },
          {
            id: "story-group-chat-leak-choice-011",
            key: "confront_privately",
            label: "Confront the leaker privately first.",
            targetNodeId: "story-group-chat-leak-node-009",
            stateEffects: { trust: 1, clues: 1, flags: ["private_confrontation"] },
          },
        ],
      },
      {
        id: "story-group-chat-leak-node-006",
        key: "greenhouse_meet",
        title: "The Rooftop Greenhouse",
        fallbackText:
          "The rooftop greenhouse smells like wet soil and overheated glass. The person waiting there is not your enemy exactly. They leaked the fake screenshot to stop a worse rumor from reaching someone they love, and now they need you to decide how ugly the cleanup gets.",
        basePrompt:
          "Write a confrontation scene with emotional complexity and clear options.",
        choices: [
          {
            id: "story-group-chat-leak-choice-012",
            key: "protect_then_fix",
            label: "Protect them tonight and fix it in the morning.",
            targetNodeId: "story-group-chat-leak-node-009",
            stateEffects: { trust: 2, flags: ["protected_them"] },
          },
          {
            id: "story-group-chat-leak-choice-013",
            key: "force_truth_now",
            label: "Force the truth into the open right now.",
            targetNodeId: "story-group-chat-leak-node-008",
            stateEffects: { courage: 1, flags: ["forced_truth"] },
          },
        ],
      },
      {
        id: "story-group-chat-leak-node-007",
        key: "panic_in_public",
        title: "Who Panics First",
        fallbackText:
          "The second you nudge the chat, one student deletes three messages and another sends you a paragraph begging you not to post anything else. The leak is suddenly less about your reputation and more about who is terrified of being seen standing next to it.",
        basePrompt:
          "Write a pressure scene where public panic becomes useful information.",
        choices: [
          {
            id: "story-group-chat-leak-choice-014",
            key: "save_everything",
            label: "Save everything and bring it to the faculty moderator.",
            targetNodeId: "story-group-chat-leak-node-008",
            stateEffects: { clues: 1, flags: ["faculty_route"] },
          },
          {
            id: "story-group-chat-leak-choice-015",
            key: "dm_the_quiet_one",
            label: "DM the quiet one who never meant this to spread.",
            targetNodeId: "story-group-chat-leak-node-009",
            stateEffects: { trust: 1, flags: ["quiet_dm"] },
          },
        ],
      },
      {
        id: "story-group-chat-leak-node-008",
        key: "ending_clear_your_name",
        title: "Ending: Clear Your Name",
        fallbackText:
          "By morning, the receipts are out, the fake screenshot falls apart under real timestamps, and your name is clean again. The panel still happens, but now everyone walks in knowing exactly who treated a lie like a strategy.",
        basePrompt:
          "Write a decisive YA ending where public truth wins, but not without social fallout.",
        isEnding: true,
        choices: [],
      },
      {
        id: "story-group-chat-leak-node-009",
        key: "ending_protect_the_soft_spot",
        title: "Ending: Protect the Soft Spot",
        fallbackText:
          "You fix the lie without turning one mistake into a school execution. The rumor dies quieter, your name still survives, and one person who hurt you ends up owing you honesty for a very long time.",
        basePrompt:
          "Write a softer but still satisfying ending about control, mercy, and earned trust.",
        isEnding: true,
        choices: [],
      },
    ],
  },
  {
    id: "story-pool-light-signal-001",
    seriesId: null,
    slug: "pool-light-signal",
    title: "Pool Light Signal",
    description:
      "The public pool is closed for the summer, but at 12:13 a.m. the underwater lights flash your name across the deep end.",
    contentMode: "NORMAL",
    targetAudience: "US teens",
    baseContext:
      "The pool has been locked since Memorial Day, so when the deep-end lights blink on at 12:13 a.m. and spell your initials across the water, you know someone wants you there.",
    initialState: {
      trust: 0,
      clues: 0,
      courage: 0,
      flags: [],
    },
    nodes: [
      {
        id: "story-pool-light-signal-node-001",
        key: "midnight_pool",
        title: "Lights Under Black Water",
        fallbackText:
          "The chain-link gate rattles in the wind, and the pool beyond it glows an impossible blue. No lifeguards, no music, no summer noise at all. Just your initials rippling across the deep end like the water learned how to text.",
        basePrompt:
          "Write a hooky YA mystery opening with vivid visuals and an eerie but teen-safe tone.",
        choices: [
          {
            id: "story-pool-light-signal-choice-001",
            key: "climb_gate",
            label: "Climb the gate and get inside.",
            targetNodeId: "story-pool-light-signal-node-002",
            stateEffects: { courage: 1, flags: ["climbed_gate"] },
          },
          {
            id: "story-pool-light-signal-choice-002",
            key: "circle_fence",
            label: "Circle the fence and look for a side entry.",
            targetNodeId: "story-pool-light-signal-node-003",
            stateEffects: { clues: 1, flags: ["circled_fence"] },
          },
          {
            id: "story-pool-light-signal-choice-003",
            key: "call_nina",
            label: "Call Nina, the ex-lifeguard.",
            targetNodeId: "story-pool-light-signal-node-004",
            stateEffects: { trust: 1, flags: ["called_nina"] },
          },
        ],
      },
      {
        id: "story-pool-light-signal-node-002",
        key: "wet_deck",
        title: "The Deck Is Already Wet",
        fallbackText:
          "Inside the gate, the concrete is wet like someone dragged a lane rope across it minutes ago. At the starting blocks, you find a whistle, a flashlight, and a folded note that says look below where the trophies were.",
        basePrompt:
          "Write a clue-heavy poolside scene with clean spatial detail and real momentum.",
        choices: [
          {
            id: "story-pool-light-signal-choice-004",
            key: "check_trophy_case",
            label: "Check beneath the old trophy case.",
            targetNodeId: "story-pool-light-signal-node-005",
            stateEffects: { clues: 1, flags: ["trophy_case"] },
          },
          {
            id: "story-pool-light-signal-choice-005",
            key: "shine_flashlight_water",
            label: "Sweep the flashlight across the water first.",
            targetNodeId: "story-pool-light-signal-node-006",
            stateEffects: { courage: 1, flags: ["swept_water"] },
          },
        ],
      },
      {
        id: "story-pool-light-signal-node-003",
        key: "pump_room_door",
        title: "The Pump Room Door",
        fallbackText:
          "The side fence leads to the pump room, where the padlock is open but still hanging in place. Inside, the timer board has been rewired by hand, and one relay keeps tripping on and off like someone wanted the lights to call you, not anyone else.",
        basePrompt:
          "Write a mechanical clue scene that still feels cinematic and teen-friendly.",
        choices: [
          {
            id: "story-pool-light-signal-choice-006",
            key: "trace_wires",
            label: "Trace the rewired lights to their power source.",
            targetNodeId: "story-pool-light-signal-node-005",
            stateEffects: { clues: 1, flags: ["traced_wires"] },
          },
          {
            id: "story-pool-light-signal-choice-007",
            key: "follow_footprints",
            label: "Follow the wet footprints back outside.",
            targetNodeId: "story-pool-light-signal-node-006",
            stateEffects: { courage: 1, clues: 1, flags: ["followed_footprints"] },
          },
        ],
      },
      {
        id: "story-pool-light-signal-node-004",
        key: "nina_knows",
        title: "Nina Picks Up",
        fallbackText:
          "Nina answers whispering, then swears when you say the pool lights are on. She tells you nobody should be there except the booster-club president's son, who has been sneaking in after hours looking for the meet ledger that disappeared the week your brother got blamed.",
        basePrompt:
          "Write a phone-call reveal that ties the mystery to a personal stake.",
        choices: [
          {
            id: "story-pool-light-signal-choice-008",
            key: "wait_for_nina",
            label: "Wait for Nina to drive over.",
            targetNodeId: "story-pool-light-signal-node-007",
            unlockPolicy: "PREMIUM_ONLY",
            unlockLabel: "Premium Route",
            stateEffects: { trust: 2, flags: ["waited_for_nina"] },
          },
          {
            id: "story-pool-light-signal-choice-009",
            key: "go_without_her",
            label: "Go in before whoever is there can leave.",
            targetNodeId: "story-pool-light-signal-node-006",
            stateEffects: { courage: 1, flags: ["went_alone"] },
          },
        ],
      },
      {
        id: "story-pool-light-signal-node-005",
        key: "ledger_box",
        title: "The Missing Ledger",
        fallbackText:
          "Below the trophy case is a plastic document box wrapped in a swim-team towel from three seasons ago. Inside is the missing ledger, plus proof that meet fees were skimmed and pinned on your brother because he was easiest to blame.",
        basePrompt:
          "Write a mid-story discovery scene that turns a spooky setup into a human betrayal.",
        choices: [
          {
            id: "story-pool-light-signal-choice-010",
            key: "take_box_public",
            label: "Take the box straight to the night manager.",
            targetNodeId: "story-pool-light-signal-node-008",
            stateEffects: { courage: 1, flags: ["box_public"] },
          },
          {
            id: "story-pool-light-signal-choice-011",
            key: "catch_real_thief",
            label: "Hide the box and catch who comes back for it.",
            targetNodeId: "story-pool-light-signal-node-009",
            stateEffects: { clues: 1, trust: 1, flags: ["set_watch"] },
          },
        ],
      },
      {
        id: "story-pool-light-signal-node-006",
        key: "deep_end_shadow",
        title: "Movement in the Deep End",
        fallbackText:
          "Someone cuts through the reflection at the deep end and starts toward the pump room. It is not a ghost, just a scared boy with a stolen key and the kind of guilt that makes him move like every splash is an alarm.",
        basePrompt:
          "Write a confrontation reveal that replaces supernatural fear with urgent human stakes.",
        choices: [
          {
            id: "story-pool-light-signal-choice-012",
            key: "corner_him",
            label: "Corner him before he can dump the evidence.",
            targetNodeId: "story-pool-light-signal-node-009",
            stateEffects: { courage: 1, flags: ["cornered_him"] },
          },
          {
            id: "story-pool-light-signal-choice-013",
            key: "offer_deal",
            label: "Offer him one chance to tell the truth first.",
            targetNodeId: "story-pool-light-signal-node-008",
            stateEffects: { trust: 1, flags: ["offered_deal"] },
          },
        ],
      },
      {
        id: "story-pool-light-signal-node-007",
        key: "nina_arrives",
        title: "Headlights Through the Fence",
        fallbackText:
          "Nina's headlights rake across the chain-link just as a second figure bolts from the locker hall. With backup finally here, the pool stops feeling haunted and starts feeling like a crime scene that waited too long for a witness.",
        basePrompt:
          "Write a relief beat that sharpens the chase instead of defusing it.",
        choices: [
          {
            id: "story-pool-light-signal-choice-014",
            key: "split_up",
            label: "Split up and cover both exits.",
            targetNodeId: "story-pool-light-signal-node-009",
            stateEffects: { clues: 1, trust: 1, flags: ["split_up"] },
          },
          {
            id: "story-pool-light-signal-choice-015",
            key: "protect_ledger",
            label: "Stay with the ledger and make the evidence stick.",
            targetNodeId: "story-pool-light-signal-node-008",
            stateEffects: { courage: 1, flags: ["protected_ledger"] },
          },
        ],
      },
      {
        id: "story-pool-light-signal-node-008",
        key: "ending_clear_the_name",
        title: "Ending: Clear the Name",
        fallbackText:
          "By sunrise, the ledger is in adult hands, the fake story about your brother finally cracks, and the pool lights go dark for ordinary reasons again. Some secrets still float around town, but this one stops owning your family.",
        basePrompt:
          "Write a clean, satisfying ending focused on vindication and relief.",
        isEnding: true,
        choices: [],
      },
      {
        id: "story-pool-light-signal-node-009",
        key: "ending_catch_them_wet",
        title: "Ending: Catch Them Wet",
        fallbackText:
          "You catch the real thief trying to recover the ledger before dawn and force the whole mess into daylight. The truth is uglier than the ghost story people wanted, but it finally belongs to the right people.",
        basePrompt:
          "Write a sharper ending where catching the culprit matters as much as the evidence.",
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
