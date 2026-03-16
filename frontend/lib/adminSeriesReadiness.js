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
  const author = normalizeText(series?.author);
  const coverUrl = normalizeText(series?.coverUrl || series?.coverImage);
  const description = normalizeText(series?.description);
  const genres = normalizeGenres(series?.genres);
  const episodeCount = toNumber(
    series?.episodeCount ?? series?._count?.episodes ?? series?.totalEpisodes,
  );
  const isPublished = Boolean(series?.isPublished);

  const checks = [
    {
      id: "author",
      label: "作者归因",
      ok: Boolean(author),
      weight: 20,
      hint: author
        ? "creator 页面和前台信任模块可以直接复用。"
        : "缺作者会切断 creator 聚合与作者发现入口。",
    },
    {
      id: "cover",
      label: "封面资源",
      ok: Boolean(coverUrl),
      weight: 20,
      hint: coverUrl
        ? "作品列表、详情头图和推荐卡片都有可用素材。"
        : "没有封面会明显拖低首页、搜索和榜单点击率。",
    },
    {
      id: "description",
      label: "作品简介",
      ok: description.length >= 40,
      weight: 15,
      hint:
        description.length >= 40
          ? "简介长度足够支撑详情页、SEO 摘要和分享文案。"
          : "简介过短会让系列页和搜索摘要显得单薄。",
    },
    {
      id: "genres",
      label: "分类标签",
      ok: genres.length > 0,
      weight: 15,
      hint:
        genres.length > 0
          ? "搜索过滤、相关推荐和 creator 聚合都能吃到标签。"
          : "缺标签会削弱搜索过滤和相关推荐命中。",
    },
    {
      id: "episodes",
      label: "章节准备",
      ok: episodeCount > 0,
      weight: 20,
      hint:
        episodeCount > 0
          ? "读者可以从详情页直接进入阅读，不会撞到空壳页。"
          : "没有章节时，前台作品页很难承接任何转化。",
    },
    {
      id: "published",
      label: "前台发布",
      ok: isPublished,
      weight: 10,
      hint: isPublished
        ? "前台列表和详情页都可以正常承接流量。"
        : "未发布作品不会进入前台分发链路。",
    },
  ];

  const score = checks.reduce((sum, item) => sum + (item.ok ? item.weight : 0), 0);
  const missingItems = checks.filter((item) => !item.ok);
  const topIssues = missingItems.slice(0, 3).map((item) => item.label);

  let tone = "rose";
  let statusLabel = "基础信息不足";

  if (missingItems.length === 0) {
    tone = "emerald";
    statusLabel = "头部站就绪";
  } else if (score >= 70) {
    tone = "cyan";
    statusLabel = "接近头部站";
  } else if (score >= 45) {
    tone = "amber";
    statusLabel = "待补关键信息";
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
        ? "前台发现、详情转化和基础分发资料已经齐备。"
        : `优先补 ${topIssues.join("、")}，会最快改善前台发现和转化承接。`,
  };
}
