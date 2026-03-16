export const STOREFRONT_SLOT_PRESETS = [
  {
    token: "library-return",
    label: "书架回流位",
    hint: "给高意图回访用户安排下一本最该继续打开的作品。",
  },
  {
    token: "home-hero",
    label: "首页英雄位",
    hint: "首页首屏轮播位，承担最大流量入口。",
  },
  {
    token: "home-free-start",
    label: "免费开篇位",
    hint: "适合承接新客首读和低门槛转化。",
  },
  {
    token: "home-binge-ready",
    label: "完结追读位",
    hint: "适合周末长阅读和高完成度作品。",
  },
  {
    token: "home-breakout",
    label: "爆款新作位",
    hint: "适合承接热度上涨和新作爆发期。",
  },
  {
    token: "custom",
    label: "自定义推荐位",
    hint: "手动输入机器标识，用于特殊活动或实验位。",
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
    label: String(value || "未命名推荐位").trim() || "未命名推荐位",
    hint: "自定义推荐位，建议保持机器标识稳定，避免前台联动失效。",
  };
}
