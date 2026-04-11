"use client";

import { normalizeAdminErrorMessage } from "@/lib/adminApiClient";

export const DEFAULT_FORM = {
  seed: "",
  seriesPerType: "20",
  minEpisodes: "10",
  maxEpisodes: "30",
};

export function parsePositiveInteger(value) {
  const normalized = String(value || "").trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildGeneratorPayload(form) {
  const payload = {
    seriesPerType: parsePositiveInteger(form.seriesPerType) ?? 20,
    minEpisodes: parsePositiveInteger(form.minEpisodes) ?? 10,
    maxEpisodes: parsePositiveInteger(form.maxEpisodes) ?? 30,
  };

  const seed = String(form.seed || "").trim();
  if (seed) {
    payload.seed = seed;
  }

  return payload;
}

export function validateForm(form) {
  const seriesPerType = parsePositiveInteger(form.seriesPerType);
  if (!seriesPerType) {
    return "每种类型作品数必须是整数。";
  }
  if (seriesPerType > 20) {
    return "每种类型作品数不能大于 20。";
  }

  const minEpisodes = parsePositiveInteger(form.minEpisodes);
  if (!minEpisodes) {
    return "最少章节数必须是整数。";
  }
  if (minEpisodes > 30) {
    return "最少章节数不能大于 30。";
  }

  const maxEpisodes = parsePositiveInteger(form.maxEpisodes);
  if (!maxEpisodes) {
    return "最多章节数必须是整数。";
  }
  if (maxEpisodes > 30) {
    return "最多章节数不能大于 30。";
  }
  if (minEpisodes > maxEpisodes) {
    return "最多章节数必须大于或等于最少章节数。";
  }

  return "";
}

export function readGeneratorErrorMessage(error) {
  return normalizeAdminErrorMessage(error, "内容生成失败。");
}

export function buildGeneratorMetricCards({
  estimatedSeriesTotal,
  previewMinEpisodes,
  previewMaxEpisodes,
}) {
  return [
    {
      label: "预计作品数",
      value: String(estimatedSeriesTotal),
      detail: "每次会按相同数量生成漫画和小说。",
      tone: "accent",
    },
    {
      label: "章节范围",
      value: `${previewMinEpisodes}-${previewMaxEpisodes}`,
      detail: "每部生成作品都会落在设定的章节区间里。",
    },
    {
      label: "使用范围",
      value: "仅测试工具",
      detail: "生产环境必须通过 ADMIN_CONTENT_GENERATOR_ENABLED 开关保护。",
    },
  ];
}

export function buildGeneratorChecklist({
  previewSeriesPerType,
  previewMinEpisodes,
  previewMaxEpisodes,
}) {
  return [
    `${previewSeriesPerType} 部漫画作品`,
    `${previewSeriesPerType} 部小说作品`,
    previewMinEpisodes === previewMaxEpisodes
      ? `每部 ${previewMinEpisodes} 话`
      : `每部 ${previewMinEpisodes} 到 ${previewMaxEpisodes} 话`,
    "元数据只面向测试、版式检查和后台流程验证",
  ];
}
