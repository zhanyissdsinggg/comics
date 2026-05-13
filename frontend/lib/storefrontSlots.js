export const STOREFRONT_SLOT_PRESETS = [
  {
    token: "library-return",
    label: "书库回流",
    hint: "给已经准备继续追更的读者一个自然回到故事里的入口。",
  },
  {
    token: "home-hero",
    label: "首页主视觉",
    hint: "首页首屏最核心的故事位，应该只放最稳的一部作品。",
  },
  {
    token: "home-free-start",
    label: "从这里开始",
    hint: "给新读者准备的低门槛入口位，先把第一部作品推稳。",
  },
  {
    token: "home-binge-ready",
    label: "适合连看",
    hint: "适合放完结作品或章节储备充足的作品，方便读者一口气看下去。",
  },
  {
    token: "home-breakout",
    label: "近期亮点",
    hint: "展示近期状态最好、最值得额外曝光的作品，但不要靠虚假热度硬推。",
  },
  {
    token: "custom",
    label: "自定义推荐位",
    hint: "手动维护的推荐位，用于特殊专题或阶段性实验。",
  },
];

export function normalizeStorefrontSlotToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function getStorefrontSlotPreset(token) {
  const normalized = normalizeStorefrontSlotToken(token);
  return (
    STOREFRONT_SLOT_PRESETS.find((item) => item.token === normalized) || null
  );
}

export function getStorefrontSlotDisplayMeta(value) {
  const normalized = normalizeStorefrontSlotToken(value);
  const preset = getStorefrontSlotPreset(normalized);

  if (preset) {
    return preset;
  }

  return {
    token: normalized || "custom",
    label: String(value || "自定义推荐位").trim() || "自定义推荐位",
    hint: "推荐位标识尽量保持稳定，避免前台接线和埋点映射变乱。",
  };
}
