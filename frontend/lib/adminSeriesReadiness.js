import {
  resolveSeriesCreatorIdentity,
  resolveSeriesCreatorName,
} from "./creatorIdentity";

function normalizeText(value) {
  return String(value || "").trim();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGenres(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  return normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getAdminSeriesReadiness(series) {
  const creatorIdentity = resolveSeriesCreatorIdentity(series);
  const creatorLabel = resolveSeriesCreatorName(series);
  const hasCreatorCredit = Boolean(creatorLabel);
  const coverUrl = normalizeText(series?.coverUrl || series?.coverImage);
  const description = normalizeText(series?.description);
  const genres = normalizeGenres(series?.genres);
  const episodeCount = toNumber(
    series?.episodeCount ?? series?._count?.episodes ?? series?.totalEpisodes,
  );
  const isPublished = Boolean(series?.isPublished);

  const checks = [
    {
      id: "creator",
      label: "创作者署名",
      ok: hasCreatorCredit,
      weight: 20,
      hint: hasCreatorCredit
        ? `当前会以“${creatorLabel}”进入创作者页、作品页署名和发现流。`
        : "缺少公开署名会直接削弱作品可信度，也会让创作者发现页失去依据。",
    },
    {
      id: "cover",
      label: "封面素材",
      ok: Boolean(coverUrl),
      weight: 20,
      hint: coverUrl
        ? "封面已可用于列表页、作品页头图和前台编排位。"
        : "缺少封面会让列表页、搜索结果和推荐位都显得没收口。",
    },
    {
      id: "description",
      label: "简介摘要",
      ok: description.length >= 40,
      weight: 15,
      hint:
        description.length >= 40
          ? "简介长度已经足够支撑作品详情页、摘要卡片和分享预览。"
          : "简介过短会让作品页显得单薄，也不利于读者快速判断要不要点开。",
    },
    {
      id: "genres",
      label: "题材标签",
      ok: genres.length > 0,
      weight: 15,
      hint:
        genres.length > 0
          ? "题材标签已足够支撑搜索、筛选、专题编排和相关推荐。"
          : "缺少题材标签会让筛选、相关推荐和首页编排都失去抓手。",
    },
    {
      id: "episodes",
      label: "章节可读",
      ok: episodeCount > 0,
      weight: 20,
      hint:
        episodeCount > 0
          ? "读者已经可以从作品页进入真实阅读路径。"
          : "没有章节时，就算作品上线了，也很难承接前台流量。",
    },
    {
      id: "published",
      label: "前台可见",
      ok: isPublished,
      weight: 10,
      hint: isPublished
        ? "这部作品已经能在正常前台路由里被读者看到。"
        : "草稿状态不会进入公开发现流，仍需要发布动作才能对外可见。",
    },
  ];

  const score = checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
  const missingItems = checks.filter((item) => !item.ok);
  const topIssues = missingItems.slice(0, 3).map((item) => item.label);

  let tone = "rose";
  let statusLabel = "基础信息待补齐";

  if (missingItems.length === 0) {
    tone = "emerald";
    statusLabel = "已可进入前台";
  } else if (score >= 70) {
    tone = "cyan";
    statusLabel = "接近可发布";
  } else if (score >= 45) {
    tone = "amber";
    statusLabel = "需要集中补一轮";
  }

  return {
    score,
    tone,
    statusLabel,
    checks,
    missingItems,
    missingCount: missingItems.length,
    topIssues,
    isReady: missingItems.length === 0,
    summary:
      missingItems.length === 0
        ? "这部作品已经适合进入前台发现流、作品详情页和创作者导流路径。"
        : `优先补齐 ${topIssues.join("、")}，能最快改善前台可读性和读者信任感。`,
    creatorIdentity,
  };
}
