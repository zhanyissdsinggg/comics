export const SERIES_CATALOG = [
  {
    id: "c1",
    title: "Midnight Contract",
    type: "comic",
    adult: false,
    coverTone: "warm",
    badge: "Hot",
    latest: "Ep 38",
    genres: ["Romance", "Drama"],
    status: "Ongoing",
    rating: 4.8,
    description: "A contract binds two rivals under the midnight moon.",
    pricing: { currency: "PTS", episodePrice: 5, discount: 0.0 },
    ttf: { enabled: true, intervalHours: 24 },
  },
  {
    id: "a1",
    title: "After Dark Contract",
    type: "comic",
    adult: true,
    coverTone: "noir",
    badge: "18+",
    latest: "Ep 12",
    genres: ["Thriller", "Drama"],
    status: "Ongoing",
    rating: 4.6,
    description: "Adult-only midnight thriller.",
    pricing: { currency: "PTS", episodePrice: 6, discount: 0.0 },
    ttf: { enabled: true, intervalHours: 24 },
  },
];

export function isAdultSeriesId(id) {
  return SERIES_CATALOG.some((item) => item.id === id && item.adult);
}
