export const STOREFRONT_SLOT_PRESETS = [
  {
    token: "library-return",
    label: "Library return",
    hint: "A resume-reading lane for people already ready to come back to a story.",
  },
  {
    token: "home-hero",
    label: "Homepage hero",
    hint: "The main first-screen story placement on the home page.",
  },
  {
    token: "home-free-start",
    label: "Start here",
    hint: "An easy-entry lane for readers who need a low-friction first title.",
  },
  {
    token: "home-binge-ready",
    label: "Binge-ready",
    hint: "A lane for finished or backlog-rich stories that support longer sessions.",
  },
  {
    token: "home-breakout",
    label: "Breakout",
    hint: "A lane for rising titles and recent standouts that deserve extra attention.",
  },
  {
    token: "custom",
    label: "Custom slot",
    hint: "A manually managed recommendation slot for special campaigns or experiments.",
  },
];

export function normalizeStorefrontSlotToken(value) {
  return String(value || "").trim().toLowerCase();
}

export function getStorefrontSlotPreset(token) {
  const normalized = normalizeStorefrontSlotToken(token);
  return STOREFRONT_SLOT_PRESETS.find((item) => item.token === normalized) || null;
}

export function getStorefrontSlotDisplayMeta(value) {
  const normalized = normalizeStorefrontSlotToken(value);
  const preset = getStorefrontSlotPreset(normalized);

  if (preset) {
    return preset;
  }

  return {
    token: normalized || "custom",
    label: String(value || "Custom recommendation slot").trim() || "Custom recommendation slot",
    hint: "Keep the machine token stable so storefront wiring stays predictable.",
  };
}
