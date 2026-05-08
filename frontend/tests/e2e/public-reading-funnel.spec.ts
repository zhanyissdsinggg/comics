import http, { type Server } from "node:http";
import { expect, test, type Page, type Route } from "@playwright/test";
import {
  createBannerPlaceholder,
  createPosterPlaceholder,
  createReaderPagePlaceholder,
} from "./support/placeholders";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const UI_TIMEOUT_MS = 15000;
const LEGAL_ENTITY_NAME = "Targaryen technology Co., Limited";
const BRAND_OPERATED_STATEMENT = `Gush Comics is operated by ${LEGAL_ENTITY_NAME}.`;
const BANNED_STRINGS = [
  "Demo Series",
  "Gush Demo Studio",
  "smoke test",
  "reader QA",
  "Demo Action",
  "Demo Episode",
  "Demo genre",
  "platform smoke tests",
  "QA",
  "fixture",
  "placeholder",
] as const;

const CATALOG = [
  {
    id: "series-001",
    title: "The Last Kingdom",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "A rogue prince fights to keep one last city from falling.",
    shortDescription: "A rogue prince fights to keep one last city from falling.",
    synopsis: "A rogue prince fights to keep one last city from falling.",
    coverUrl: createPosterPlaceholder("The Last Kingdom"),
    bannerUrl: createBannerPlaceholder("The Last Kingdom"),
    genres: ["Fantasy", "Action"],
    episodeCount: 3,
    latestEpisodeId: "series-001e3",
    updatedAt: "2026-04-20T12:00:00.000Z",
    creator: {
      label: "Mira Dane",
      type: "person",
      slug: "mira-dane-d1b324",
      creatorId: "creator_mira_dane",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_mira_dane",
        slug: "mira-dane-d1b324",
        name: "Mira Dane",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-002",
    title: "Moonlight Sonata",
    type: "comic",
    status: "Completed",
    adult: false,
    description: "A concert pianist uncovers a family conspiracy hidden inside a final recital.",
    shortDescription: "A concert pianist uncovers a family conspiracy hidden inside a final recital.",
    synopsis: "A concert pianist uncovers a family conspiracy hidden inside a final recital.",
    coverUrl: createPosterPlaceholder("Moonlight Sonata"),
    bannerUrl: createBannerPlaceholder("Moonlight Sonata"),
    genres: ["Drama", "Mystery"],
    episodeCount: 3,
    latestEpisodeId: "series-002e3",
    updatedAt: "2026-04-16T12:00:00.000Z",
    creator: {
      label: "Elena Park",
      type: "person",
      slug: "elena-park-f1b201",
      creatorId: "creator_elena_park",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_elena_park",
        slug: "elena-park-f1b201",
        name: "Elena Park",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-003",
    title: "Shadow Protocol",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "A covert courier gets trapped between a vanished agent and a citywide surveillance dragnet.",
    shortDescription: "A covert courier gets trapped between a vanished agent and a citywide surveillance dragnet.",
    synopsis: "A covert courier gets trapped between a vanished agent and a citywide surveillance dragnet.",
    coverUrl: createPosterPlaceholder("Shadow Protocol"),
    bannerUrl: createBannerPlaceholder("Shadow Protocol"),
    genres: ["Action", "Thriller"],
    episodeCount: 3,
    latestEpisodeId: "series-003e3",
    updatedAt: "2026-04-17T12:00:00.000Z",
    creator: {
      label: "Aster Quinn",
      type: "person",
      slug: "aster-quinn-421f0a",
      creatorId: "creator_aster_quinn",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_aster_quinn",
        slug: "aster-quinn-421f0a",
        name: "Aster Quinn",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-004",
    title: "Cherry Blossom High",
    type: "comic",
    status: "Completed",
    adult: false,
    description: "A shy transfer student stumbles into one spring of confessions, festivals, and second chances.",
    shortDescription: "A shy transfer student stumbles into one spring of confessions, festivals, and second chances.",
    synopsis: "A shy transfer student stumbles into one spring of confessions, festivals, and second chances.",
    coverUrl: createPosterPlaceholder("Cherry Blossom High"),
    bannerUrl: createBannerPlaceholder("Cherry Blossom High"),
    genres: ["Romance", "Comedy"],
    episodeCount: 3,
    latestEpisodeId: "series-004e3",
    updatedAt: "2026-04-12T12:00:00.000Z",
    creator: {
      label: "Hana Seo",
      type: "person",
      slug: "hana-seo-b0a4d1",
      creatorId: "creator_hana_seo",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_hana_seo",
        slug: "hana-seo-b0a4d1",
        name: "Hana Seo",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-005",
    title: "Dragon's Oath",
    type: "novel",
    status: "Completed",
    adult: false,
    description: "A street mage takes one bad deal and starts a war with dragons.",
    shortDescription: "A street mage takes one bad deal and starts a war with dragons.",
    synopsis: "A street mage takes one bad deal and starts a war with dragons.",
    coverUrl: createPosterPlaceholder("Dragon's Oath"),
    bannerUrl: createBannerPlaceholder("Dragon's Oath"),
    genres: ["Fantasy", "Adventure"],
    episodeCount: 2,
    latestEpisodeId: "series-005e2",
    updatedAt: "2026-04-14T12:00:00.000Z",
    creator: {
      label: "Rowan Vale",
      type: "person",
      slug: "rowan-vale-a4f200",
      creatorId: "creator_rowan_vale",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_rowan_vale",
        slug: "rowan-vale-a4f200",
        name: "Rowan Vale",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-011",
    title: "Solar Wind",
    type: "novel",
    status: "Ongoing",
    adult: false,
    description: "A courier crew races a solar storm to keep one city online.",
    shortDescription: "A courier crew races a solar storm to keep one city online.",
    synopsis: "A courier crew races a solar storm to keep one city online.",
    coverUrl: createPosterPlaceholder("Solar Wind"),
    bannerUrl: createBannerPlaceholder("Solar Wind"),
    genres: ["Sci-Fi", "Drama"],
    episodeCount: 3,
    latestEpisodeId: "series-011e3",
    updatedAt: "2026-04-22T12:00:00.000Z",
    creator: {
      label: "Mira Dane",
      type: "person",
      slug: "mira-dane-d1b324",
      creatorId: "creator_mira_dane",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_mira_dane",
        slug: "mira-dane-d1b324",
        name: "Mira Dane",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-006",
    title: "Neon Nights",
    type: "novel",
    status: "Ongoing",
    adult: false,
    description: "A night courier tracks a missing singer through a city full of glitches.",
    shortDescription: "A night courier tracks a missing singer through a city full of glitches.",
    synopsis: "A night courier tracks a missing singer through a city full of glitches.",
    coverUrl: createPosterPlaceholder("Neon Nights"),
    bannerUrl: createBannerPlaceholder("Neon Nights"),
    genres: ["Mystery", "Sci-Fi"],
    episodeCount: 3,
    latestEpisodeId: "series-006e3",
    updatedAt: "2026-04-21T12:00:00.000Z",
    creator: {
      label: "Iris Voss",
      type: "person",
      slug: "iris-voss-e120c9",
      creatorId: "creator_iris_voss",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_iris_voss",
        slug: "iris-voss-e120c9",
        name: "Iris Voss",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-009",
    title: "Starfall Academy",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "A scholarship student finds out the academy's stars are hiding a dangerous secret.",
    shortDescription: "A scholarship student finds out the academy's stars are hiding a dangerous secret.",
    synopsis: "A scholarship student finds out the academy's stars are hiding a dangerous secret.",
    coverUrl: createPosterPlaceholder("Starfall Academy"),
    bannerUrl: createBannerPlaceholder("Starfall Academy"),
    genres: ["Fantasy", "School Life"],
    episodeCount: 3,
    latestEpisodeId: "series-009e3",
    updatedAt: "2026-04-18T12:00:00.000Z",
    creator: {
      label: "Naomi Vale",
      type: "person",
      slug: "naomi-vale-f7a3c1",
      creatorId: "creator_naomi_vale",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_naomi_vale",
        slug: "naomi-vale-f7a3c1",
        name: "Naomi Vale",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-010",
    title: "Crimson Tide",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "A harbor crew outruns a city-wide blackout and the people behind it.",
    shortDescription: "A harbor crew outruns a city-wide blackout and the people behind it.",
    synopsis: "A harbor crew outruns a city-wide blackout and the people behind it.",
    coverUrl: createPosterPlaceholder("Crimson Tide"),
    bannerUrl: createBannerPlaceholder("Crimson Tide"),
    genres: ["Horror", "Action"],
    episodeCount: 3,
    latestEpisodeId: "series-010e3",
    updatedAt: "2026-04-18T12:00:00.000Z",
    creator: {
      label: "Rook Hollow Studio",
      type: "studio",
      slug: "rook-hollow-studio-31fd27",
      creatorId: "creator_rook_hollow_studio",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_rook_hollow_studio",
        slug: "rook-hollow-studio-31fd27",
        name: "Rook Hollow Studio",
        type: "studio",
        role: "studio",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-012",
    title: "Midnight Heat",
    type: "comic",
    status: "Ongoing",
    adult: true,
    rating: "18+",
    description: "Two rivals drag a city secret into a late-night spiral.",
    shortDescription: "Two rivals drag a city secret into a late-night spiral.",
    synopsis: "Two rivals drag a city secret into a late-night spiral.",
    coverUrl: createPosterPlaceholder("Midnight Heat"),
    bannerUrl: createBannerPlaceholder("Midnight Heat"),
    genres: ["Mature", "Thriller"],
    episodeCount: 2,
    latestEpisodeId: "series-012e2",
    updatedAt: "2026-04-24T12:00:00.000Z",
    creator: {
      label: "Vale After Dark",
      type: "studio",
      slug: "vale-after-dark-9921ab",
      creatorId: "creator_vale_after_dark",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_vale_after_dark",
        slug: "vale-after-dark-9921ab",
        name: "Vale After Dark",
        type: "studio",
        role: "studio",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-007",
    title: "The Quiet Storm",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "A storm watcher returns home and finds the coast hiding more than bad weather.",
    shortDescription: "A storm watcher returns home and finds the coast hiding more than bad weather.",
    synopsis: "A storm watcher returns home and finds the coast hiding more than bad weather.",
    coverUrl: createPosterPlaceholder("The Quiet Storm"),
    bannerUrl: createBannerPlaceholder("The Quiet Storm"),
    genres: ["Drama", "Mystery"],
    episodeCount: 3,
    latestEpisodeId: "series-007e3",
    updatedAt: "2026-04-15T12:00:00.000Z",
    creator: {
      label: "Lena Shore",
      type: "person",
      slug: "lena-shore-d3f9ac",
      creatorId: "creator_lena_shore",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_lena_shore",
        slug: "lena-shore-d3f9ac",
        name: "Lena Shore",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
  {
    id: "series-008",
    title: "Apex Predator",
    type: "comic",
    status: "Ongoing",
    adult: false,
    description: "A rescue team lands on a hunting moon and realizes it was bait all along.",
    shortDescription: "A rescue team lands on a hunting moon and realizes it was bait all along.",
    synopsis: "A rescue team lands on a hunting moon and realizes it was bait all along.",
    coverUrl: createPosterPlaceholder("Apex Predator"),
    bannerUrl: createBannerPlaceholder("Apex Predator"),
    genres: ["Action", "Sci-Fi"],
    episodeCount: 3,
    latestEpisodeId: "series-008e3",
    updatedAt: "2026-04-19T12:00:00.000Z",
    creator: {
      label: "Kade Mercer",
      type: "person",
      slug: "kade-mercer-2f8b14",
      creatorId: "creator_kade_mercer",
      isFallback: false,
    },
    creatorCredits: [
      {
        creatorId: "creator_kade_mercer",
        slug: "kade-mercer-2f8b14",
        name: "Kade Mercer",
        type: "person",
        role: "writer",
        isPrimary: true,
        sortOrder: 0,
      },
    ],
  },
] as const;

const SERIES_EPISODES: Record<string, Array<Record<string, unknown>>> = {
  "series-001": [
    {
      id: "series-001e1",
      seriesId: "series-001",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-01T00:00:00.000Z",
    },
    {
      id: "series-001e2",
      seriesId: "series-001",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-08T00:00:00.000Z",
    },
    {
      id: "series-001e3",
      seriesId: "series-001",
      number: 3,
      title: "Chapter 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-15T00:00:00.000Z",
    },
  ],
  "series-005": [
    {
      id: "series-005e1",
      seriesId: "series-005",
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-02T00:00:00.000Z",
    },
    {
      id: "series-005e2",
      seriesId: "series-005",
      number: 2,
      title: "Episode 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-09T00:00:00.000Z",
    },
  ],
  "series-002": [
    {
      id: "series-002e1",
      seriesId: "series-002",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-02T00:00:00.000Z",
    },
    {
      id: "series-002e2",
      seriesId: "series-002",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-09T00:00:00.000Z",
    },
    {
      id: "series-002e3",
      seriesId: "series-002",
      number: 3,
      title: "Chapter 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-16T00:00:00.000Z",
    },
  ],
  "series-003": [
    {
      id: "series-003e1",
      seriesId: "series-003",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-03T00:00:00.000Z",
    },
    {
      id: "series-003e2",
      seriesId: "series-003",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-10T00:00:00.000Z",
    },
    {
      id: "series-003e3",
      seriesId: "series-003",
      number: 3,
      title: "Chapter 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-17T00:00:00.000Z",
    },
  ],
  "series-004": [
    {
      id: "series-004e1",
      seriesId: "series-004",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-01T00:00:00.000Z",
    },
    {
      id: "series-004e2",
      seriesId: "series-004",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-08T00:00:00.000Z",
    },
    {
      id: "series-004e3",
      seriesId: "series-004",
      number: 3,
      title: "Chapter 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-15T00:00:00.000Z",
    },
  ],
  "series-009": [
    {
      id: "series-009e1",
      seriesId: "series-009",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-03-30T00:00:00.000Z",
    },
    {
      id: "series-009e2",
      seriesId: "series-009",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-06T00:00:00.000Z",
    },
    {
      id: "series-009e3",
      seriesId: "series-009",
      number: 3,
      title: "Chapter 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-13T00:00:00.000Z",
    },
  ],
  "series-006": [
    {
      id: "series-006e1",
      seriesId: "series-006",
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-03T00:00:00.000Z",
    },
    {
      id: "series-006e2",
      seriesId: "series-006",
      number: 2,
      title: "Episode 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-10T00:00:00.000Z",
    },
    {
      id: "series-006e3",
      seriesId: "series-006",
      number: 3,
      title: "Episode 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-17T00:00:00.000Z",
    },
  ],
  "series-010": [
    {
      id: "series-010e1",
      seriesId: "series-010",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-06T00:00:00.000Z",
    },
    {
      id: "series-010e2",
      seriesId: "series-010",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-13T00:00:00.000Z",
    },
    {
      id: "series-010e3",
      seriesId: "series-010",
      number: 3,
      title: "Chapter 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-20T00:00:00.000Z",
    },
  ],
  "series-011": [
    {
      id: "series-011e1",
      seriesId: "series-011",
      number: 1,
      title: "Episode 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-05T00:00:00.000Z",
    },
    {
      id: "series-011e2",
      seriesId: "series-011",
      number: 2,
      title: "Episode 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-12T00:00:00.000Z",
    },
    {
      id: "series-011e3",
      seriesId: "series-011",
      number: 3,
      title: "Episode 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-19T00:00:00.000Z",
    },
  ],
  "series-012": [
    {
      id: "series-012e1",
      seriesId: "series-012",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-10T00:00:00.000Z",
    },
    {
      id: "series-012e2",
      seriesId: "series-012",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-17T00:00:00.000Z",
    },
  ],
  "series-007": [
    {
      id: "series-007e1",
      seriesId: "series-007",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-04T00:00:00.000Z",
    },
    {
      id: "series-007e2",
      seriesId: "series-007",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-11T00:00:00.000Z",
    },
    {
      id: "series-007e3",
      seriesId: "series-007",
      number: 3,
      title: "Chapter 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-18T00:00:00.000Z",
    },
  ],
  "series-008": [
    {
      id: "series-008e1",
      seriesId: "series-008",
      number: 1,
      title: "Chapter 1",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-05T00:00:00.000Z",
    },
    {
      id: "series-008e2",
      seriesId: "series-008",
      number: 2,
      title: "Chapter 2",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-12T00:00:00.000Z",
    },
    {
      id: "series-008e3",
      seriesId: "series-008",
      number: 3,
      title: "Chapter 3",
      pricePts: 0,
      previewFreePages: 3,
      ttfEligible: false,
      releasedAt: "2026-04-19T00:00:00.000Z",
    },
  ],
};

const REAL_SERIES_ROUTE_SPECS = [
  { id: "series-001", title: "The Last Kingdom", listLabel: "Chapters", adult: false },
  { id: "series-002", title: "Moonlight Sonata", listLabel: "Chapters", adult: false },
  { id: "series-003", title: "Shadow Protocol", listLabel: "Chapters", adult: false },
  { id: "series-004", title: "Cherry Blossom High", listLabel: "Chapters", adult: false },
  { id: "series-005", title: "Dragon's Oath", listLabel: "Episodes", adult: false },
  { id: "series-006", title: "Neon Nights", listLabel: "Episodes", adult: false },
  { id: "series-007", title: "The Quiet Storm", listLabel: "Chapters", adult: false },
  { id: "series-008", title: "Apex Predator", listLabel: "Chapters", adult: false },
  { id: "series-009", title: "Starfall Academy", listLabel: "Chapters", adult: false },
  { id: "series-010", title: "Crimson Tide", listLabel: "Chapters", adult: false },
  { id: "series-011", title: "Solar Wind", listLabel: "Episodes", adult: false },
  { id: "series-012", title: "Midnight Heat", listLabel: "Chapters", adult: true },
] as const;

const CANONICAL_ROUTE_SPECS = [
  { path: "/", title: /Trending Comics, Novels, and Interactive Stories \| Gush/i, heading: null },
  { path: "/comics", title: /Comics/i, heading: /^Comics$/i },
  { path: "/novels", title: /Novels/i, heading: /^Novels$/i },
  { path: "/creators", title: /Creators/i, heading: /^Creators$/i },
  { path: "/search", title: /Search Comics & Novels/i, heading: /^Titles$/i },
  { path: "/rankings", title: /Trending Stories/i, heading: /Trending/i },
  { path: "/series/series-001", title: /The Last Kingdom|Story/i, heading: /The Last Kingdom/i },
  { path: "/series/series-011", title: /Solar Wind|Story/i, heading: /Solar Wind/i },
  { path: "/support", title: /Support/i, heading: /Support/i },
  { path: "/account", title: /Account/i, heading: /Account/i },
  { path: "/library", title: /Library/i, heading: /Your library/i },
  { path: "/orders", title: /Orders/i, heading: /Sign in to view purchases/i },
] as const;

const BANNED_COPY_ROUTE_PATHS = [
  "/",
  "/comics",
  "/novels",
  "/creators",
  "/search",
  "/rankings",
  "/series/series-001",
  "/series/series-011",
  "/store",
] as const;

function buildSeriesPayload(seriesId: string) {
  const series = CATALOG.find((item) => item.id === seriesId);
  if (!series) {
    return null;
  }
  return {
    series,
    episodes: SERIES_EPISODES[series.id] || [],
  };
}

function buildEpisodePayload(seriesId: string, episodeId: string) {
  const series = CATALOG.find((item) => item.id === seriesId);
  if (!series) {
    return null;
  }
  const episode =
    (SERIES_EPISODES[seriesId] || []).find((item) => item.id === episodeId) ||
    null;

  if (!episode) {
    return null;
  }

  return {
    episode: {
      id: episode?.id || `${seriesId}e1`,
      seriesId,
      title: String(episode?.title || "Chapter 1"),
      type: series.type || "comic",
      pricePts: 0,
      previewFreePages: 3,
      pages: [
        { url: createReaderPagePlaceholder(`${seriesId}-${episodeId}-1`), w: 800, h: 1200 },
        { url: createReaderPagePlaceholder(`${seriesId}-${episodeId}-2`), w: 800, h: 1200 },
        { url: createReaderPagePlaceholder(`${seriesId}-${episodeId}-3`), w: 800, h: 1200 },
      ],
      paragraphs: [],
    },
  };
}

function filterCatalog(searchParams: URLSearchParams) {
  const query = String(searchParams.get("q") || "").trim().toLowerCase();
  const type = String(searchParams.get("type") || "").trim().toLowerCase();
  const status = String(searchParams.get("status") || "").trim().toLowerCase();
  const genre = String(searchParams.get("genre") || "").trim().toLowerCase();
  const adult = String(searchParams.get("adult") || "0").trim();

  return CATALOG.filter((series) => {
    if (adult !== "1" && series.adult) {
      return false;
    }

    const matchesQuery =
      !query ||
      series.title.toLowerCase().includes(query) ||
      series.description.toLowerCase().includes(query) ||
      (series.creator?.label || "").toLowerCase().includes(query) ||
      series.genres.some((item) => item.toLowerCase().includes(query));

    const matchesType = !type || type === "all" || series.type.toLowerCase() === type;
    const normalizedStatus = series.status.toLowerCase();
    const matchesStatus =
      !status ||
      status === "all" ||
      normalizedStatus === status ||
      (status === "ongoing" && normalizedStatus !== "completed");
    const matchesGenre =
      !genre ||
      (genre === "mature"
        ? Boolean(series.adult)
        : series.genres.some((item) => item.toLowerCase() === genre));

    return matchesQuery && matchesType && matchesStatus && matchesGenre;
  });
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function gotoWithRetry(page: Page, url: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await page.goto(url, { waitUntil: "domcontentloaded" });
    } catch (error) {
      lastError = error;
      const message = String(error || "");
      const isTransientNavigationError =
        message.includes("ERR_ABORTED") || message.includes("frame was detached");

      if (!isTransientNavigationError || attempt === 2) {
        throw error;
      }
    }
  }

  throw lastError;
}

function jsonResponse(response: http.ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

function createMockBackendServer() {
  return http.createServer((request, response) => {
    if (!request.url) {
      jsonResponse(response, 404, { error: "NOT_FOUND" });
      return;
    }

    const url = new URL(request.url, "http://127.0.0.1:4000");
    const { pathname, searchParams } = url;

    if (pathname === "/api/series") {
      const adult = searchParams.get("adult") || "0";
      jsonResponse(response, 200, {
        series: CATALOG.filter((series) => adult === "1" || !series.adult),
      });
      return;
    }

    if (pathname.startsWith("/api/series/")) {
      const seriesId = pathname.split("/").pop() || "series-001";
      const payload = buildSeriesPayload(seriesId);
      if (!payload) {
        jsonResponse(response, 404, { error: "NOT_FOUND" });
        return;
      }
      jsonResponse(response, 200, payload);
      return;
    }

    if (pathname === "/api/episode") {
      const seriesId = searchParams.get("seriesId") || "series-001";
      const episodeId = searchParams.get("episodeId") || `${seriesId}e1`;
      jsonResponse(response, 200, buildEpisodePayload(seriesId, episodeId));
      return;
    }

    jsonResponse(response, 404, { error: "NOT_FOUND" });
  });
}

async function mockPublicApi(page: Page, options: { signedIn?: boolean } = {}) {
  const { signedIn = false } = options;

  await page.addInitScript(() => {
    window.localStorage.setItem("cookie_consent", "accepted");
  });

  await page.route("**/api/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const searchParams = requestUrl.searchParams;

    if (
      pathname === "/api/health" ||
      pathname === "/api/health/ready" ||
      pathname === "/api/health/live"
    ) {
      await fulfillJson(route, { ok: true, dbOk: true });
      return;
    }

    if (pathname === "/api/meta/version") {
      await fulfillJson(route, {
        name: "gush-backend",
        version: "0.1.0",
        commit: "test-commit",
      });
      return;
    }

    if (pathname === "/api/regions/config") {
      await fulfillJson(route, { regions: [], defaultRegion: "US" });
      return;
    }

    if (pathname === "/api/branding") {
      await fulfillJson(route, { branding: {} });
      return;
    }

    if (pathname === "/api/auth/me") {
      await fulfillJson(
        route,
        signedIn
          ? {
              isSignedIn: true,
              user: {
                id: "reader-001",
                email: "reader@example.com",
                displayName: "Reader One",
              },
            }
          : { isSignedIn: false, user: null },
      );
      return;
    }

    if (pathname === "/api/preferences") {
      await fulfillJson(route, {
        preferences: {
          adult: false,
          autoplay: false,
        },
      });
      return;
    }

    if (pathname === "/api/series") {
      const adult = searchParams.get("adult") || "0";
      await fulfillJson(route, {
        series: CATALOG.filter((series) => adult === "1" || !series.adult),
      });
      return;
    }

    if (pathname.startsWith("/api/series/")) {
      const seriesId = pathname.split("/").pop() || "series-001";
      const payload = buildSeriesPayload(seriesId);
      if (!payload) {
        await fulfillJson(route, { error: "NOT_FOUND" }, 404);
        return;
      }
      await fulfillJson(route, payload);
      return;
    }

    if (pathname === "/api/episode") {
      const seriesId = searchParams.get("seriesId") || "series-001";
      const episodeId = searchParams.get("episodeId") || `${seriesId}e1`;
      const payload = buildEpisodePayload(seriesId, episodeId);
      if (!payload) {
        await fulfillJson(route, { error: "NOT_FOUND" }, 404);
        return;
      }
      await fulfillJson(route, payload);
      return;
    }

    if (pathname === "/api/recommendations/homepage") {
      await fulfillJson(route, {
        slots: [
          { id: "slot-home-breakout", slot: "home-breakout", seriesIds: ["series-001"] },
          { id: "slot-home-free-start", slot: "home-free-start", seriesIds: ["series-001"] },
          { id: "slot-home-binge-ready", slot: "home-binge-ready", seriesIds: ["series-009"] },
        ],
      });
      return;
    }

    if (pathname.startsWith("/api/recommendations/similar/")) {
      await fulfillJson(route, { recommendations: [] });
      return;
    }

    if (pathname.startsWith("/api/interactive-stories/by-series/")) {
      await fulfillJson(route, { story: null });
      return;
    }

    if (pathname === "/api/search") {
      const results = filterCatalog(searchParams);
      await fulfillJson(route, {
        results,
        total: results.length,
        page: 1,
        pageSize: 12,
        appliedSort: searchParams.get("sort") || "relevance",
      });
      return;
    }

    if (pathname === "/api/search/suggest") {
      const query = String(searchParams.get("q") || "").trim().toLowerCase();
      const suggestions = filterCatalog(searchParams)
        .map((series) => series.title)
        .filter((title) => title.toLowerCase().includes(query))
        .slice(0, 5);

      await fulfillJson(route, { suggestions });
      return;
    }

    if (pathname === "/api/search/keywords") {
      await fulfillJson(route, {
        keywords: ["Fantasy", "Action", "Adventure", "Comedy"],
      });
      return;
    }

    if (pathname === "/api/search/hot") {
      await fulfillJson(route, {
        keywords: [
          { keyword: "dragon", label: "dragon", value: "dragon", badge: "Hot" },
          { keyword: "mira", label: "mira", value: "mira", badge: "Hot" },
        ],
      });
      return;
    }

    if (pathname === "/api/search/log") {
      await fulfillJson(route, { ok: true });
      return;
    }

    if (pathname === "/api/wallet") {
      await fulfillJson(route, {
        wallet: {
          paidPts: 0,
          bonusPts: 0,
          plan: "free",
          subscription: null,
          subscriptionUsage: { remaining: 0 },
        },
      });
      return;
    }

    if (pathname === "/api/progress") {
      await fulfillJson(route, { progress: {} });
      return;
    }

    if (pathname === "/api/entitlements") {
      await fulfillJson(route, { entitlements: [] });
      return;
    }

    if (pathname === "/api/follow") {
      await fulfillJson(route, { followedSeriesIds: [] });
      return;
    }

    if (pathname === "/api/coupons") {
      await fulfillJson(route, { coupons: [] });
      return;
    }

    if (pathname === "/api/orders" || pathname === "/api/orders/reconcile") {
      await fulfillJson(route, { orders: [] });
      return;
    }

    if (pathname === "/api/events/batch") {
      await fulfillJson(route, { ok: true }, 201);
      return;
    }

    if (pathname === "/api/support") {
      await fulfillJson(route, { ok: true });
      return;
    }

    await fulfillJson(route, {});
  });
}

async function expectNoBannedCopy(page: Page, routePath: string) {
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const banned of BANNED_STRINGS) {
    expect(bodyText, `${routePath} should not expose banned string "${banned}"`).not.toContain(
      banned.toLowerCase(),
    );
  }
}

function getSeriesHeroMetadataText(series) {
  const creatorName = String(series?.creator?.label || "").trim();
  const installmentLabel = series?.type === "novel" ? "Episode" : "Chapter";
  const latestNumber = Number(series?.episodeCount || 0);
  return `By ${creatorName} · Latest ${installmentLabel} ${latestNumber}`;
}

test.describe("Public reading funnel", () => {
  test.describe.configure({ mode: "serial" });

  let mockBackend: Server | null = null;

  test.beforeAll(async () => {
    mockBackend = createMockBackendServer();
    await new Promise<void>((resolve, reject) => {
      mockBackend?.once("error", (error: NodeJS.ErrnoException) => {
        if (error?.code === "EADDRINUSE") {
          resolve();
          return;
        }
        reject(error);
      });
      mockBackend?.listen(4000, "127.0.0.1", () => resolve());
    });
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (!mockBackend) {
        resolve();
        return;
      }
      try {
        mockBackend.close(() => resolve());
      } catch {
        resolve();
      }
    });
  });

  test("home loads canonical hero", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.locator("main h1").first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.getByTestId("home-hero-primary-cta")).toHaveText(
      /Read (Chapter|Episode) 1 Free/i,
    );
    await expect(page.getByTestId("home-hero-primary-cta")).toHaveAttribute(
      "href",
      /\/read\/series-\d+\/series-\d+e1$/,
    );
    await expectNoBannedCopy(page, "/");
    await expectNoRuntimeIssues("/", runtimeIssues);
  });

  test("header nav links work for comics, novels, search, account, and support", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page, { signedIn: true });
    await page.setViewportSize({ width: 390, height: 844 });

    let response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    const mobileNav = page.getByRole("navigation", {
      name: "Mobile bottom navigation",
    });
    await expect(mobileNav).toBeVisible({ timeout: UI_TIMEOUT_MS });
    const mobileSearchLink = mobileNav.locator('a[href="/search"]');
    await expect(mobileSearchLink).toBeVisible({ timeout: UI_TIMEOUT_MS });

    await Promise.all([
      page.waitForURL(/\/search(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      mobileSearchLink.click({ force: true }),
    ]);
    await expect(page.getByRole("heading", { name: "Titles" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.getByRole("button", { name: /Open menu/i }).click();
    const menu = page.locator("div.fixed.inset-0.z-50");
    await expect(menu).toBeVisible({ timeout: UI_TIMEOUT_MS });

    await Promise.all([
      page.waitForURL(/\/comics(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      menu.getByRole("link", { name: "Comics" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Comics" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await page.getByRole("button", { name: /Open menu/i }).click();
    await expect(menu).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await Promise.all([
      page.waitForURL(/\/novels(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      menu.getByRole("link", { name: "Novels" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Novels" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await Promise.all([
      page.waitForURL(/\/account(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      mobileNav.getByRole("link", { name: "Account" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Account" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    const footer = page.getByRole("contentinfo");
    await Promise.all([
      page.waitForURL(/\/support(?:\?|$)/, { timeout: UI_TIMEOUT_MS }),
      footer.getByRole("link", { name: "Support" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "Support" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    await expectNoRuntimeIssues("header-nav-mobile", runtimeIssues);
  });

  test("search for a known title returns a result", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/search?q=dragon", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("link", { name: /Dragon's Oath/i }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.getByText(/2 results for "dragon"\./i)).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoRuntimeIssues("/search?q=dragon", runtimeIssues);
  });

  test("search filters change result sets from URL params", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    let response = await page.goto("/search?genre=Horror", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("link", { name: /Crimson Tide/i }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("main")).toContainText("Horror");
    await expect(page.locator("main")).not.toContainText("Trending titles");
    await expect(page.locator("main")).not.toContainText("Neon Nights");

    response = await page.goto("/search?genre=Mystery", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("link", { name: /Neon Nights/i }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("main")).toContainText("Mystery");
    await expect(page.locator("main")).not.toContainText("Trending titles");
    await expect(page.locator("main")).not.toContainText("Crimson Tide");

    response = await page.goto("/search?format=novel", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("main")).toContainText("Solar Wind");
    await expect(page.locator("main")).toContainText("Neon Nights");
    await expect(page.locator("main")).not.toContainText("Crimson Tide");
    await expect(page.locator("main")).not.toContainText("The Last Kingdom");

    await expectNoRuntimeIssues("/search filter params", runtimeIssues);
  });

  test("comics and search expose a controlled Mature filter without random 18+ chrome", async ({
    page,
    browser,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page, { signedIn: true });

    let response = await page.goto("/comics", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const comicsHeader = page.locator("header").first();
    const comicsFooter = page.locator("footer").first();
    const comicsMatureFilter = page.locator(
      'a:has-text("Mature"), button:has-text("Mature")',
    );
    await expect(comicsMatureFilter.first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(comicsHeader).not.toContainText(/^18\+$/);
    await expect(comicsFooter).not.toContainText(/^18\+$/);
    await comicsMatureFilter.first().click();
    await expect(
      page.getByRole("button", { name: /Yes, I am 18 or older/i }),
    ).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await Promise.all([
      page.waitForURL(/\/comics\?genre=Mature/, { timeout: UI_TIMEOUT_MS }),
      page.getByRole("button", { name: /Yes, I am 18 or older/i }).click(),
    ]);
    await expect(page.getByRole("link", { name: /Midnight Heat/i }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("main")).toContainText("18+");

    response = await page.goto("/search", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const searchHeader = page.locator("header").first();
    const searchFooter = page.locator("footer").first();
    const searchMatureFilter = page.locator(
      'button:has-text("Mature"), a:has-text("Mature")',
    );
    await expect(searchMatureFilter.first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(searchHeader).not.toContainText(/^18\+$/);
    await expect(searchFooter).not.toContainText(/^18\+$/);
    for (const routePath of [
      "/search?genre=Horror",
      "/search?genre=Mystery",
      "/search?format=novel",
    ]) {
      const filterCheckPage = await browser.newPage();
      await mockPublicApi(filterCheckPage, { signedIn: true });
      response = await filterCheckPage.goto(routePath, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();
      await expect(
        filterCheckPage.getByRole("link", { name: "Mature" }).first(),
      ).toBeVisible({
        timeout: UI_TIMEOUT_MS,
      });
      await filterCheckPage.close();
    }

    const gatedContext = await browser.newContext();
    const gatedPage = await gatedContext.newPage();
    const gatedRuntimeIssues = collectRuntimeIssues(gatedPage);
    await mockPublicApi(gatedPage, { signedIn: false });

    response = await gatedPage.goto("/search?genre=Mature", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(gatedPage.locator("main")).toContainText(
      "Confirm legal age to view mature titles.",
    );
    await expect(gatedPage.locator("main")).not.toContainText(
      /0 results? match(?:es)? your filters\./i,
    );
    await expect(gatedPage.locator("main")).not.toContainText("No exact match");
    await expect(
      gatedPage.getByRole("link", { name: "Sign in to continue" }),
    ).toHaveAttribute("href", "/account");
    await expect(
      gatedPage.getByRole("link", { name: "Browse non-mature titles" }),
    ).toHaveAttribute("href", "/search");
    await expect(gatedPage.locator("header").first()).not.toContainText(/^18\+$/);
    await expect(gatedPage.locator("footer").first()).not.toContainText(/^18\+$/);

    response = await gatedPage.goto("/comics?genre=Mature", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    const gatedComicsMain = gatedPage.locator("main");
    await expect(gatedComicsMain).toContainText(
      "Confirm legal age to view mature titles.",
    );
    await expect(gatedComicsMain).not.toContainText("No comics found");
    await expect(gatedComicsMain).not.toContainText("Trending");
    await expect(gatedComicsMain).not.toContainText("New updates");
    await expect(gatedComicsMain).not.toContainText("Completed");
    await expect(
      gatedPage.getByRole("link", { name: "Sign in to continue" }),
    ).toHaveAttribute("href", "/account");
    await expect(
      gatedPage.getByRole("link", { name: "Browse non-mature titles" }),
    ).toHaveAttribute("href", "/comics");
    await expect(gatedPage.locator("header").first()).not.toContainText(/^18\+$/);
    await expect(gatedPage.locator("footer").first()).not.toContainText(/^18\+$/);

    await expectNoRuntimeIssues("mature-filter-catalog-entry", runtimeIssues);
    await expectNoRuntimeIssues("mature-filter-catalog-gated", gatedRuntimeIssues);
    await gatedContext.close();
  });

  test("comics title card opens canonical series detail", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/comics", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const titleCard = page.getByRole("link", { name: /The Last Kingdom/i }).first();
    await expect(titleCard).toBeVisible({ timeout: UI_TIMEOUT_MS });

    await Promise.all([
      page.waitForURL("**/series/series-001", { timeout: UI_TIMEOUT_MS }),
      titleCard.click(),
    ]);

    await expect(page.getByRole("heading", { name: "The Last Kingdom" })).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoRuntimeIssues("/comics -> /series/series-001", runtimeIssues);
  });

  test("series primary CTA opens reader route", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/series/series-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const primaryCta = page.getByTestId("series-primary-action");
    await expect(primaryCta).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await expect(primaryCta).toHaveAttribute(
      "href",
      /\/read\/series-001\/series-001e1$/,
    );
    await gotoWithRetry(page, "/read/series-001/series-001e1");

    await expect(page.getByText("Chapter 1").first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoRuntimeIssues("/series/series-001 -> reader", runtimeIssues);
  });

  test("chapter list links open reader route", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/series/series-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const chapterAction = page.locator("#episode-series-001e2 a").first();
    await expect(chapterAction).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await expect(chapterAction).toHaveAttribute(
      "href",
      /\/read\/series-001\/series-001e2$/,
    );

    await Promise.all([
      page.waitForURL("**/read/series-001/series-001e2", {
        timeout: UI_TIMEOUT_MS,
      }),
      chapterAction.click(),
    ]);

    await expect(page.getByText("Chapter 2").first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoRuntimeIssues("/series/series-001 chapter list", runtimeIssues);
  });

  test("novels use episode terminology everywhere", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/series/series-011", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Solar Wind" })).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.locator("body")).toContainText("Episodes");
    await expect(page.locator("#episode-series-011e1")).toContainText("Episode 1");
    await expect(page.locator("#episode-series-011e2")).toContainText("Episode 2");
    await expect(page.locator("#episode-series-011e3")).toContainText("Episode 3");
    await expect(page.locator("body")).not.toContainText(/Chapter 1|Chapter 2|Chapter 3/i);
    await expectNoRuntimeIssues("/series/series-011 terminology", runtimeIssues);
  });

  test("all real series routes render non-empty SSR detail content", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    for (const seriesSpec of REAL_SERIES_ROUTE_SPECS) {
      const routePath = `/series/${seriesSpec.id}`;
      const response = await gotoWithRetry(page, routePath);
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();

      const readLinks = page.locator(`a[href^="/read/${seriesSpec.id}/"]`);
      if (seriesSpec.adult) {
        await expect(
          page.getByRole("heading", { level: 1, name: seriesSpec.title }),
        ).toHaveCount(0);
        await expect(page.locator("main")).toContainText("18+ access");
        await expect(page.locator("main")).not.toContainText(seriesSpec.listLabel);
        await expect(readLinks).toHaveCount(0);
      } else {
        await expect(
          page.getByRole("heading", { level: 1, name: seriesSpec.title }),
        ).toBeVisible({
          timeout: UI_TIMEOUT_MS,
        });
        await expect(page.locator("main")).toContainText(seriesSpec.listLabel);
        await expect(readLinks.first()).toBeVisible({
          timeout: UI_TIMEOUT_MS,
        });
      }

      const ssrOrder = await page.evaluate(() => {
        const header = document.querySelector("body > header");
        const main = document.querySelector("body > main");
        const footer = document.querySelector("body > footer");
        const mainText = (main?.textContent || "").replace(/\s+/g, " ").trim();
        const bodyText = (document.body.textContent || "")
          .replace(/\s+/g, " ")
          .trim();

        return {
          hasTopLevelHeader: Boolean(header),
          hasTopLevelMain: Boolean(main),
          hasTopLevelFooter: Boolean(footer),
          hasMainHeading: Boolean(main?.querySelector("h1")),
          hasEntryLink: Boolean(main?.querySelector('a[href^="/read/"]')),
          hasEntryList:
            Boolean(main?.querySelector("[id^='episode-']")) ||
            /chapters|episodes/i.test(mainText),
          headerOnlyLayout:
            !mainText ||
            (!/read/i.test(mainText) && !/chapter|episode/i.test(mainText)),
          headerIndex: Array.from(document.body.children).findIndex(
            (node) => node.tagName === "HEADER",
          ),
          mainIndex: Array.from(document.body.children).findIndex(
            (node) => node.tagName === "MAIN",
          ),
          footerIndex: Array.from(document.body.children).findIndex(
            (node) => node.tagName === "FOOTER",
          ),
        };
      });

      expect(ssrOrder.hasTopLevelHeader, `${routePath} should keep the public header`).toBeTruthy();
      expect(ssrOrder.hasTopLevelMain, `${routePath} should render top-level main`).toBeTruthy();
      expect(ssrOrder.hasTopLevelFooter, `${routePath} should keep the public footer`).toBeTruthy();
      if (seriesSpec.adult) {
        expect(ssrOrder.hasMainHeading, `${routePath} should show the adult gate instead of the detail heading`).toBeFalsy();
        expect(ssrOrder.hasEntryLink, `${routePath} should stay gated until age confirmation`).toBeFalsy();
        expect(ssrOrder.hasEntryList, `${routePath} should not expose the entry list while gated`).toBeFalsy();
      } else {
        expect(ssrOrder.hasMainHeading, `${routePath} should SSR an h1`).toBeTruthy();
        expect(ssrOrder.hasEntryLink, `${routePath} should SSR at least one reader link`).toBeTruthy();
        expect(ssrOrder.hasEntryList, `${routePath} should SSR a chapter or episode list`).toBeTruthy();
      }
      if (seriesSpec.adult) {
        expect(
          ssrOrder.headerOnlyLayout,
          `${routePath} should render an intentional adult gate instead of collapsing to layout chrome`,
        ).toBeTruthy();
      } else {
        expect(ssrOrder.headerOnlyLayout, `${routePath} should not collapse to header/footer only`).toBeFalsy();
      }
      expect(ssrOrder.headerIndex, `${routePath} should keep header first`).toBeGreaterThanOrEqual(0);
      expect(ssrOrder.mainIndex, `${routePath} should keep main after header`).toBeGreaterThan(
        ssrOrder.headerIndex,
      );
      expect(ssrOrder.footerIndex, `${routePath} should keep footer after main`).toBeGreaterThan(
        ssrOrder.mainIndex,
      );
    }

    await expectNoRuntimeIssues("all-series-ssr-detail-content", runtimeIssues);
  });

  test("series detail pages render exactly one canonical detail block", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    for (const seriesSpec of REAL_SERIES_ROUTE_SPECS.filter((item) => !item.adult)) {
      const routePath = `/series/${seriesSpec.id}`;
      const response = await page.goto(routePath, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();

      await expect(
        page.getByRole("heading", { level: 1, name: seriesSpec.title }),
      ).toHaveCount(1);
      await expect(page.locator("footer")).toHaveCount(1);
      await expect(
        page.locator(`a[href^="/read/${seriesSpec.id}/"]`).first(),
      ).toBeVisible({
        timeout: UI_TIMEOUT_MS,
      });

      const duplicateCheck = await page.evaluate((title) => {
        const main = document.querySelector("body > main");
        const footer = document.querySelector("body > footer");
        const bodyChildren = Array.from(document.body.children);
        const titleMatches = Array.from(
          document.querySelectorAll("main h1, main [data-testid='series-title']"),
        ).filter((node) => (node.textContent || "").trim() === title).length;

        return {
          titleMatches,
          entryHeadingCount: Array.from(
            document.querySelectorAll("main h1, main h2, main h3"),
          ).filter((node) =>
            /chapters|episodes/i.test((node.textContent || "").trim()),
          ).length,
          footerAfterMain:
            Boolean(main) &&
            Boolean(footer) &&
            bodyChildren.indexOf(footer) > bodyChildren.indexOf(main),
        };
      }, seriesSpec.title);

      expect(
        duplicateCheck.titleMatches,
        `${routePath} should keep a single title heading inside main`,
      ).toBe(1);
      expect(
        duplicateCheck.entryHeadingCount,
        `${routePath} should keep one visible list heading`,
      ).toBe(1);
      expect(
        duplicateCheck.footerAfterMain,
        `${routePath} should keep the footer after main`,
      ).toBeTruthy();
    }

    await expectNoRuntimeIssues("series-single-detail-block", runtimeIssues);
  });

  test("series pages keep header, main, and footer in canonical order", async ({
    page,
    request,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    for (const routePath of [
      "/series/series-001",
      "/series/series-005",
      "/series/series-009",
      "/series/series-010",
      "/series/series-011",
    ]) {
      const response = await page.goto(routePath, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();

      const expectedListMarker =
        routePath === "/series/series-011" || routePath === "/series/series-005"
          ? "Episodes"
          : "Chapters";

      await expect(page.locator("header").first()).toBeVisible({
        timeout: UI_TIMEOUT_MS,
      });
      await expect(page.locator("main").first()).toBeVisible({
        timeout: UI_TIMEOUT_MS,
      });
      await expect(page.locator("footer").first()).toBeVisible({
        timeout: UI_TIMEOUT_MS,
      });
      await expect(page.locator("main")).toContainText(expectedListMarker);

      const counts = await page.evaluate(() => ({
        headerCount: document.querySelectorAll("body > header").length,
        footerCount: document.querySelectorAll("body > footer").length,
        mainCount: document.querySelectorAll("body > main").length,
        entryListInsideMain:
          Boolean(document.querySelector("main [id^='episode-']")) ||
          /episodes|chapters/i.test(
            document.querySelector("main")?.textContent || "",
          ),
      }));

      expect(counts.headerCount, `${routePath} should render one top-level header`).toBe(1);
      expect(counts.mainCount, `${routePath} should render one top-level main`).toBe(1);
      expect(counts.footerCount, `${routePath} should render one top-level footer`).toBe(1);
      expect(counts.entryListInsideMain, `${routePath} should keep entry list inside main`).toBeTruthy();

      const order = await page.evaluate(() => {
        const bodyChildren = Array.from(document.body.children);
        return {
        headerIndex: bodyChildren.findIndex((node) => node.tagName === "HEADER"),
        mainIndex: bodyChildren.findIndex((node) => node.tagName === "MAIN"),
        footerIndex: bodyChildren.findIndex((node) => node.tagName === "FOOTER"),
        };
      });

      expect(order.headerIndex).toBeGreaterThanOrEqual(0);
      expect(order.mainIndex).toBeGreaterThan(order.headerIndex);
      expect(order.footerIndex).toBeGreaterThan(order.mainIndex);
    }

    await expectNoRuntimeIssues("series-layout-order", runtimeIssues);
  });

  test("creator link opens creator detail without demo or QA copy", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/series/series-001", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const creatorLink = page.getByTestId("series-creator-link");
    await expect(creatorLink).toBeVisible({ timeout: UI_TIMEOUT_MS });
    await expect(creatorLink).toHaveAttribute("href", /\/creators\/mira-dane-d1b324/);
    const creatorHref = await creatorLink.getAttribute("href");
    expect(new URL(creatorHref || "/creators/mira-dane-d1b324", "http://127.0.0.1").pathname).toBe(
      "/creators/mira-dane-d1b324",
    );
    const creatorResponse = await page.goto(creatorHref || "/creators/mira-dane-d1b324", {
      waitUntil: "domcontentloaded",
    });
    expect(creatorResponse?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Mira Dane" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expectNoBannedCopy(page, "/creators/mira-dane-d1b324");
    await expectNoRuntimeIssues("/creators/mira-dane-d1b324", runtimeIssues);
  });

  test("store and membership links stay hidden when prelaunch flags are disabled", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("link", { name: "Store" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Plans" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Membership" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Orders" })).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(/Point packs/i);
    await expect(page.locator("body")).not.toContainText(/Compare plans/i);
    await expectNoRuntimeIssues("prelaunch-commerce-hidden", runtimeIssues);
  });

  test("library signed-out state renders the message only once", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/library", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Your library" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });

    const signedOutCopyCount = await page.evaluate(() => {
      const text = document.body.innerText || "";
      const matches = text.match(/Sign in to save progress and favorites\./g);
      return matches ? matches.length : 0;
    });

    expect(signedOutCopyCount).toBe(1);
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toHaveAttribute(
      "href",
      "/account",
    );
    await expect(
      page.getByRole("link", { name: "Browse free chapters" }).first(),
    ).toHaveAttribute("href", "/comics");
    await expectNoRuntimeIssues("/library signed-out", runtimeIssues);
  });

  test("account signed-out view prioritizes account actions and collapses device settings", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page, { signedIn: false });

    const response = await page.goto("/account", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Account" }).first()).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.getByRole("navigation", { name: "Account actions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toHaveAttribute(
      "href",
      /\/account\?openLogin=1/,
    );
    await expect(
      page.getByRole("link", { name: "Create account" }).first(),
    ).toHaveAttribute("href", /\/account\?openLogin=1&mode=register/);
    await expect(
      page.getByRole("link", { name: "Reset password" }).first(),
    ).toHaveAttribute("href", "/auth/reset");
    await expect(page.getByRole("link", { name: "Support" }).first()).toHaveAttribute(
      "href",
      /\/support/,
    );
    await expect(page.getByRole("navigation", { name: "Account help" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Need help?");
    await expect(page.locator("body")).not.toContainText("Account access");

    const detailsState = await page.locator("details").first().evaluate((element) => ({
      open: element.hasAttribute("open"),
      summaryText:
        element.querySelector("summary")?.textContent?.replace(/\s+/g, " ").trim() || "",
    }));

    expect(detailsState.open).toBeFalsy();
    expect(detailsState.summaryText).toContain("Collapsed by default");
    expect(detailsState.summaryText).toContain("Device settings");
    await expect(page.locator("body")).not.toContainText("Region");
    await expect(page.locator("body")).not.toContainText("Legal age");
    await expect(page.locator("body")).not.toContainText("Language");
    await expect(page.locator("body")).not.toContainText("Hide mature titles from this device");
    await expect(page.locator("body")).not.toContainText(/^Save$/);
    await expect(page.locator("body")).not.toContainText("Deals and offers");

    await expectNoRuntimeIssues("/account signed-out", runtimeIssues);
  });

  test("catalog cards keep concise SSR text on comics and novels", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    let response = await page.goto("/comics", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("main")).toContainText("Crimson Tide");
    await expect(page.locator("main")).toContainText("Comic / Ongoing");
    await expect(page.locator("main")).toContainText("Horror · Action");
    await expect(page.locator("body")).not.toContainText("Read moreRead more");
    await expect(page.locator("body")).not.toContainText("Read more Read more");
    await expect(page.locator("body")).not.toContainText(
      "Finished comic / Completed Crimson Tide Action Read more",
    );

    response = await page.goto("/novels", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("main")).toContainText("Solar Wind");
    await expect(page.locator("main")).toContainText("Novel / Ongoing");
    await expect(page.locator("main")).toContainText("Sci-Fi · Drama");
    await expect(page.locator("body")).not.toContainText("Read moreRead more");
    await expect(page.locator("body")).not.toContainText("Read more Read more");
    await expect(page.locator("body")).not.toContainText(
      "Top Pick novel / Ongoing Solar Wind Space Read more",
    );

    response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).not.toContainText("Read moreRead more");
    await expect(page.locator("body")).not.toContainText("Read more Read more");

    response = await page.goto("/rankings", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator("body")).not.toContainText("Read moreRead more");
    await expect(page.locator("body")).not.toContainText("Read more Read more");
    await expect(page.locator("body")).not.toContainText(
      "Finished Horror Crimson Tide Supernatural Crimson Tide comic Completed",
    );
    await expect(page.locator("main")).toContainText("Crimson Tide");
    await expect(page.locator("main")).toContainText("Comic / Ongoing");
    await expect(page.locator("main")).toContainText("By Rook Hollow Studio");
    await expect(page.locator("main")).toContainText("Open series");

    await expectNoRuntimeIssues("catalog-card-ssr-copy", runtimeIssues);
  });

  test("series hero metadata stays normalized across all real series", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("mn_adult_confirmed", "1");
      window.localStorage.setItem("mn_adult_mode", "1");
      window.localStorage.setItem("mn_age_rule", "global");
    });
    await mockPublicApi(page, { signedIn: true });

    for (const series of CATALOG) {
      const routePath = `/series/${series.id}`;
      const response = await page.goto(routePath, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();
      await expect(page.locator("main h1")).toHaveCount(1);

      const metadata = page.getByTestId("series-hero-metadata");
      await expect(metadata).toContainText(getSeriesHeroMetadataText(series));
      await expect(metadata).not.toContainText(/\/Creator|\/Chapter|\/Episode/i);

      const footer = page.locator("footer");
      await expect(footer).toHaveCount(1);
      await expect(footer).toContainText(LEGAL_ENTITY_NAME);
      await expect(footer).toContainText(BRAND_OPERATED_STATEMENT);
    }

    await expectNoRuntimeIssues("/series metadata normalized", runtimeIssues);
  });

  test("support form renders and validates reply email for signed-out users", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    let supportRequestCount = 0;

    await mockPublicApi(page);
    await page.route("**/api/support", async (route) => {
      supportRequestCount += 1;
      await fulfillJson(route, { ok: true });
    });

    const response = await page.goto("/support", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { name: "Send a request" })).toBeVisible({
      timeout: UI_TIMEOUT_MS,
    });
    await expect(page.getByText("Issue details")).toBeVisible();
    await expect(
      page.getByText("Choose the issue type and the best reply email for this request."),
    ).toBeVisible();
    await expect(
      page
        .locator("fieldset")
        .filter({ has: page.getByText("Issue type", { exact: true }) })
        .first(),
    ).toBeVisible();
    await expect(
      page.locator('[role="radiogroup"][aria-label="Issue type"]'),
    ).toBeVisible();
    await expect(page.locator("#support-topic ul > li")).toHaveCount(6);
    await expect(
      page.getByText("Choose the topic that best matches your request."),
    ).toBeVisible();
    await expect(page.getByText("Billing & purchases")).toBeVisible();
    await expect(page.getByText("Login & account")).toBeVisible();
    await expect(page.getByText("Reader issue")).toBeVisible();
    await expect(page.getByText("Mature content access")).toBeVisible();
    await expect(page.getByText("Content report")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Other/i })).toBeVisible();
    await expect(page.getByLabel("Reply email")).toBeVisible();
    await expect(page.getByText("Request details")).toBeVisible();
    await expect(
      page.getByText("Add any order details, a short subject, and the full message."),
    ).toBeVisible();
    await expect(page.getByLabel("Order ID optional")).toBeVisible();
    await expect(page.getByLabel("Subject")).toBeVisible();
    await expect(page.getByLabel("Message")).toBeVisible();
    await expect(
      page.getByText("If the form is unavailable, use your email app instead."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Email backup" })).toBeVisible();
    await expect(
      page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Email backup" }) })
        .getByRole("link", { name: "Email support" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/purchases Details Wrong/i);
    await expect(page.locator("body")).not.toContainText(/account Details Email/i);
    await expect(page.locator("body")).not.toContainText(/issue Details Broken/i);
    await expect(page.locator("body")).not.toContainText(/access Details 18\+/i);
    await expect(page.locator("body")).not.toContainText(/report Details Cover/i);
    await expect(page.locator("body")).not.toContainText(/Other Details Anything/i);
    await expect(page.locator("body")).not.toContainText(/purchasesWrong/i);
    await expect(page.locator("body")).not.toContainText(/accountEmail/i);
    await expect(page.locator("body")).not.toContainText(/issueBroken/i);
    await expect(page.locator("body")).not.toContainText(/access18\+/i);
    await expect(page.locator("body")).not.toContainText(/reportCover/i);
    await expect(page.locator("body")).not.toContainText(/OtherAnything/i);
    await expect(page.locator("body")).not.toContainText("Submit Email backup");
    await page.getByText("Billing & purchases", { exact: true }).click();
    await page.fill("#support-subject", "Need help");
    await page.fill("#support-message", "I need a billing receipt.");
    await page.click("button[type='submit']");

    await expect(page.locator("#support-email")).toHaveAttribute("required", "");
    const emailValidationMessage = await page.locator("#support-email").evaluate((element) =>
      element instanceof HTMLInputElement ? element.validationMessage : "",
    );
    expect(emailValidationMessage).toBeTruthy();
    expect(supportRequestCount).toBe(0);
    await expectNoRuntimeIssues("/support validation", runtimeIssues);
  });

  test("search default shelves avoid repeated adjacent full card sets", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/search", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();

    const trendingShelf = page.getByTestId("search-default-trending");
    const updatesShelf = page.getByTestId("search-default-updates");
    const completedShelf = page.getByTestId("search-default-completed");

    await expect(trendingShelf).toContainText("Trending titles");
    await expect(updatesShelf).toContainText("New updates");
    await expect(completedShelf).toContainText("Completed reads");

    const trendingTitles = await trendingShelf
      .getByRole("heading", { level: 2 })
      .allTextContents();
    const updateTitles = await updatesShelf
      .getByRole("heading", { level: 2 })
      .allTextContents();

    const normalizedTrendingTitles = trendingTitles
      .map((item) => item.trim())
      .filter((item) => item && item !== "Trending titles");
    const normalizedUpdateTitles = updateTitles
      .map((item) => item.trim())
      .filter((item) => item && item !== "New updates");

    expect(normalizedUpdateTitles.length).toBeLessThanOrEqual(4);
    const repeatedTitles = normalizedUpdateTitles.filter((title) =>
      normalizedTrendingTitles.includes(title),
    );
    expect(repeatedTitles).toEqual([]);

    await expectNoRuntimeIssues("/search default shelves", runtimeIssues);
  });

  test("canonical public pages keep expected headings and ban internal copy", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    for (const routeSpec of CANONICAL_ROUTE_SPECS) {
      const response = await page.goto(routeSpec.path, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routeSpec.path} should load`).toBeTruthy();

      await expect(page).toHaveTitle(routeSpec.title);
      if (routeSpec.heading) {
        await expect(page.getByRole("heading", { name: routeSpec.heading }).first()).toBeVisible({
          timeout: UI_TIMEOUT_MS,
        });
      } else {
        await expect(page.locator("main h1").first()).toBeVisible({
          timeout: UI_TIMEOUT_MS,
        });
      }
      await expectNoBannedCopy(page, routeSpec.path);
    }

    await expectNoRuntimeIssues("canonical-public-routes", runtimeIssues);
  });

  test("hidden production routes stay blocked and prelaunch pages stay clean", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    let response = await page.goto("/series/demo-series", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);

    response = await page.goto("/read/demo-series/demo-seriese1", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);

    response = await page.goto("/creators/gush-demo-studio-c6420d", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(404);

    response = await page.goto("/creators", {
      waitUntil: "domcontentloaded",
    });
    expect([200, 404]).toContain(response?.status() ?? 0);
    if ((response?.status() ?? 0) === 200) {
      await expectNoBannedCopy(page, "/creators");
    }

    response = await page.goto("/store", {
      waitUntil: "domcontentloaded",
    });
    expect([200, 404]).toContain(response?.status() ?? 0);
    if ((response?.status() ?? 0) === 200) {
      await expect(page.locator("body")).toContainText(/Points are coming soon/i);
      await expect(page.locator("body")).not.toContainText(/\$4\.99|\$7\.99|\$12\.99/i);
      await expectNoBannedCopy(page, "/store");
    }

    response = await page.goto("/subscribe", {
      waitUntil: "domcontentloaded",
    });
    expect([200, 404]).toContain(response?.status() ?? 0);
    if ((response?.status() ?? 0) === 200) {
      const browseComicsLink = page.getByRole("link", { name: "Browse Comics" });
      const contactSupportLink = page.getByRole("link", { name: "Contact Support" });
      await expect(browseComicsLink).toHaveAttribute("href", "/comics");
      await expect(contactSupportLink).toHaveAttribute("href", /\/support/);
      await expect(browseComicsLink).toBeVisible();
      await expect(contactSupportLink).toBeVisible();
    }

    response = await page.goto("/terms-of-service", {
      waitUntil: "domcontentloaded",
    });
    expect([200, 404]).toContain(response?.status() ?? 0);
    if ((response?.status() ?? 0) === 200) {
      await expect(page.locator("body")).not.toContainText(
        /pending internal legal review/i,
      );
      await expect(page.locator("body")).not.toContainText(
        /laws that apply to .* where it is established/i,
      );
      await expect(page.locator("body")).toContainText("Governing Law and Venue");
      await expect(page.locator("body")).toContainText(
        "These Terms are governed by the laws of Hong Kong Special Administrative Region, without regard to conflict-of-law rules.",
      );
      await expect(page.locator("body")).toContainText(
        "Any dispute will be resolved in the courts located in Hong Kong, unless applicable consumer law gives you rights in another location.",
      );
      await expect(page.locator("body")).toContainText(BRAND_OPERATED_STATEMENT);
      await expect(
        page.getByRole("link", { name: "Email legal team" }),
      ).toHaveAttribute("href", /^mailto:/);
      await expect(
        page.getByRole("link", { name: "View privacy policy" }),
      ).toHaveAttribute("href", "/privacy-policy");
      await expect(page.locator("body")).not.toContainText("Email legal Privacy");
    }

    await expectNoRuntimeIssues("hidden-production-routes", runtimeIssues);
  });

  test("rankings keeps one hero block and one stats summary", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/rankings", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByRole("heading", { level: 1, name: "Trending" })).toHaveCount(1);
    await expect(page.locator("body")).toContainText(
      "The stories readers are opening most this week.",
    );
    await expect(page.locator("body")).toContainText(/\d+ titles/i);
    await expect(page.locator("body")).not.toContainText("Jump in");
    await expect(page.locator("body")).not.toContainText("Pick a lane");
    await expect(page.locator("body")).not.toContainText("More to Read");
    await expect(page.locator("body")).not.toContainText(/^Titles$/);
    await expect(page.locator("body")).not.toContainText("More stories this week");
    await expect(page.locator("main")).toContainText("More trending stories");
    await expect(page.locator("main")).toContainText(
      "Keep reading what readers are opening next.",
    );
    await expect(page.locator("main")).not.toContainText("Ranking");
    await expect(page.locator("main")).not.toContainText(
      "Keep scrolling through the titles readers are opening next.",
    );
    await expect(page.locator("main")).not.toContainText(
      /Finished\s+Crimson Tide[\s\S]*Comic \/ Ongoing/i,
    );
    await expect(page.locator("main")).not.toContainText(
      /Top Pick\s+Solar Wind[\s\S]*Novel \/ Ongoing/i,
    );

    await expectNoRuntimeIssues("/rankings single hero", runtimeIssues);
  });

  test("public pages keep one consistent footer legal name", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("mn_adult_confirmed", "1");
      window.localStorage.setItem("mn_adult_mode", "1");
      window.localStorage.setItem("mn_age_rule", "global");
    });
    await mockPublicApi(page, { signedIn: true });

    const routePaths = [
      "/",
      "/comics",
      "/novels",
      "/search",
      "/rankings",
      "/subscribe",
      "/support",
      "/privacy-policy",
      "/terms-of-service",
      ...CATALOG.map((series) => `/series/${series.id}`),
    ];

    for (const routePath of routePaths) {
      const response = await page.goto(routePath, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();

      const footer = page.locator("footer");
      await expect(footer).toHaveCount(1);
      await expect(footer).toContainText(LEGAL_ENTITY_NAME);
      await expect(footer).toContainText(BRAND_OPERATED_STATEMENT);
    }

    await expectNoRuntimeIssues("public-footer-legal-name", runtimeIssues);
  });

  test("legal contact areas render readable links", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    let response = await page.goto("/privacy-policy", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(
      page.getByRole("link", { name: "Email privacy team" }),
    ).toHaveAttribute("href", /^mailto:/);
    await expect(
      page.getByRole("link", { name: "Contact support" }),
    ).toHaveAttribute("href", "/support");
    await expect(page.locator("body")).not.toContainText("Email privacy Support");
    await expect(page.locator("body")).not.toContainText(/teamContact/i);

    response = await page.goto("/terms-of-service", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    await expect(
      page.getByRole("link", { name: "Email legal team" }),
    ).toHaveAttribute("href", /^mailto:/);
    await expect(
      page.getByRole("link", { name: "View privacy policy" }),
    ).toHaveAttribute("href", "/privacy-policy");
    await expect(page.locator("body")).not.toContainText("Email legal Privacy");
    await expect(page.locator("body")).not.toContainText(/teamView/i);
    await expect(page.locator("body")).toContainText("Governing Law and Venue");
    await expect(page.locator("body")).toContainText(
      "These Terms are governed by the laws of Hong Kong Special Administrative Region, without regard to conflict-of-law rules.",
    );
    await expect(page.locator("body")).toContainText(
      "Any dispute will be resolved in the courts located in Hong Kong, unless applicable consumer law gives you rights in another location.",
    );
    await expect(page.locator("body")).toContainText(BRAND_OPERATED_STATEMENT);

    await expectNoRuntimeIssues("legal-contact-links", runtimeIssues);
  });

  test("creators page keeps pluralization clean and uses real filter controls", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    const response = await page.goto("/creators", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();
    const defaultCreatorCount = await page.locator("#creator-results-grid > a").count();

    await expect(page.locator("body")).not.toContainText("match es");
    await expect(page.locator("body")).toContainText(/1 match|[2-9]\d* matches|0 matches/i);
    await expect(page.getByTestId("creator-type-filters")).toBeVisible();
    await expect(page.locator("main")).toContainText("Profile type");
    await expect(page.getByTestId("creator-genre-filters")).toBeVisible();
    await expect(page.locator("main")).toContainText("Genres");
    const typeFilters = page.getByTestId("creator-type-filters");
    await expect(typeFilters.getByRole("link", { name: "All" })).toBeVisible();
    await expect(typeFilters.getByRole("link", { name: "Creators" })).toBeVisible();
    await expect(typeFilters.getByRole("link", { name: "Studios + Teams" })).toBeVisible();
    const genreFilters = page.getByTestId("creator-genre-filters");
    await expect(genreFilters.getByRole("link", { name: "All" })).toBeVisible();
    await expect(genreFilters.getByRole("link", { name: "Action" })).toBeVisible();
    await expect(genreFilters.getByRole("link", { name: "Adventure" })).toBeVisible();
    await expect(genreFilters.getByRole("link", { name: "Romance" })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("All Creators Studios + Teams");
    await expect(page.locator("body")).not.toContainText("All Action Adventure Romance");

    let filteredResponse = await page.goto("/creators?type=creator", {
      waitUntil: "domcontentloaded",
    });
    expect(filteredResponse?.ok()).toBeTruthy();
    await expect(
      page.getByTestId("creator-type-filters").getByRole("link", {
        name: "Creators",
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(await page.locator("#creator-results-grid > a").count()).toBeLessThan(
      defaultCreatorCount,
    );
    await expect(page.locator("#creator-results-grid")).toContainText("Mira Dane");
    await expect(page.locator("#creator-results-grid")).not.toContainText(
      "Rook Hollow Studio",
    );
    await expect(page.getByTestId("creator-results-label")).toHaveText("Creators");
    await expect(page.getByTestId("creator-featured-section")).toHaveCount(0);

    filteredResponse = await page.goto("/creators?type=studio-team", {
      waitUntil: "domcontentloaded",
    });
    expect(filteredResponse?.ok()).toBeTruthy();
    await expect(
      page.getByTestId("creator-type-filters").getByRole("link", {
        name: "Studios + Teams",
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(await page.locator("#creator-results-grid > a").count()).toBeLessThan(
      defaultCreatorCount,
    );
    await expect(page.locator("#creator-results-grid")).toContainText(
      "Rook Hollow Studio",
    );
    await expect(page.locator("#creator-results-grid")).not.toContainText("Mira Dane");
    await expect(page.getByTestId("creator-results-label")).toHaveText(
      "Studios + Teams",
    );
    await expect(page.getByTestId("creator-featured-section")).toHaveCount(0);

    filteredResponse = await page.goto("/creators?genre=Romance", {
      waitUntil: "domcontentloaded",
    });
    expect(filteredResponse?.ok()).toBeTruthy();
    await expect(
      page.getByTestId("creator-genre-filters").getByRole("link", {
        name: "Romance",
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(await page.locator("#creator-results-grid > a").count()).toBeLessThan(
      defaultCreatorCount,
    );
    await expect(page.locator("#creator-results-grid")).toContainText("Hana Seo");
    await expect(page.locator("#creator-results-grid")).not.toContainText("Rook Hollow Studio");
    await expect(page.locator("main")).toContainText(/1 match|[2-9]\d* matches/i);
    await expect(page.getByTestId("creator-results-label")).toHaveText(
      "Romance profiles",
    );
    await expect(page.getByTestId("creator-featured-section")).toHaveCount(0);

    filteredResponse = await page.goto("/creators?genre=Action", {
      waitUntil: "domcontentloaded",
    });
    expect(filteredResponse?.ok()).toBeTruthy();
    await expect(
      page.getByTestId("creator-genre-filters").getByRole("link", {
        name: "Action",
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(await page.locator("#creator-results-grid > a").count()).toBeLessThan(
      defaultCreatorCount,
    );
    await expect(page.locator("#creator-results-grid")).toContainText("Mira Dane");
    await expect(page.locator("#creator-results-grid")).toContainText(
      "Rook Hollow Studio",
    );
    await expect(page.locator("#creator-results-grid")).not.toContainText("Hana Seo");
    await expect(page.getByTestId("creator-results-label")).toHaveText(
      "Action profiles",
    );
    await expect(page.getByTestId("creator-featured-section")).toHaveCount(0);

    filteredResponse = await page.goto("/creators?genre=Sci-Fi", {
      waitUntil: "domcontentloaded",
    });
    expect(filteredResponse?.ok()).toBeTruthy();
    await expect(
      page.getByTestId("creator-genre-filters").getByRole("link", {
        name: "Sci-Fi",
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(await page.locator("#creator-results-grid > a").count()).toBeLessThan(
      defaultCreatorCount,
    );
    await expect(page.locator("#creator-results-grid")).toContainText("Nightglass Studio");
    await expect(page.locator("#creator-results-grid")).toContainText(
      "Tess Calder and Orbital Forge Team",
    );
    await expect(page.locator("#creator-results-grid")).not.toContainText("Hana Seo");
    await expect(page.getByTestId("creator-results-label")).toHaveText(
      "Sci-Fi profiles",
    );

    filteredResponse = await page.goto("/creators?type=creator&genre=Romance", {
      waitUntil: "domcontentloaded",
    });
    expect(filteredResponse?.ok()).toBeTruthy();
    await expect(page.getByTestId("creator-results-label")).toHaveText(
      "Romance creators",
    );
    await expect(page.locator("#creator-results-grid")).toContainText("Hana Seo");
    await expect(page.locator("#creator-results-grid")).not.toContainText(
      "Rook Hollow Studio",
    );

    filteredResponse = await page.goto("/creators?type=studio-team&genre=Action", {
      waitUntil: "domcontentloaded",
    });
    expect(filteredResponse?.ok()).toBeTruthy();
    await expect(page.getByTestId("creator-results-label")).toHaveText(
      "Action studios + teams",
    );
    await expect(page.locator("#creator-results-grid")).toContainText(
      "Rook Hollow Studio",
    );
    await expect(page.locator("#creator-results-grid")).not.toContainText("Mira Dane");

    await expectNoRuntimeIssues("/creators pluralization", runtimeIssues);
  });

  test("series pages stay free of legacy commerce and random mature chrome", async ({
    page,
  }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    for (const routePath of CATALOG.map((series) => `/series/${series.id}`)) {
      const response = await page.goto(routePath, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();

      const header = page.locator("header").first();
      const footer = page.locator("footer").first();
      await expect(header).toContainText("Comics");
      await expect(header).toContainText("Novels");
      await expect(header).toContainText("Search");
      await expect(page.locator("body")).not.toContainText(/Point packs|Membership|VISA|MC|Store|Top Series/i);
      await expect(header).not.toContainText(/^18\+$/);
      await expect(footer).not.toContainText(/^18\+$/);
    }

    await expectNoRuntimeIssues("series chrome cleanup", runtimeIssues);
  });

  test("public catalog routes stay free of demo and fixture copy", async ({ page }) => {
    const runtimeIssues = collectRuntimeIssues(page);
    await mockPublicApi(page);

    for (const routePath of BANNED_COPY_ROUTE_PATHS) {
      const response = await page.goto(routePath, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `${routePath} should load`).toBeTruthy();
      await expectNoBannedCopy(page, routePath);
    }

    await expectNoRuntimeIssues("public-banned-copy-crawl", runtimeIssues);
  });
});
