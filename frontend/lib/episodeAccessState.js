import { calculatePrice } from "./pricing";

export const EPISODE_PRIMARY_STATE_ORDER = [
  "free",
  "preview",
  "points",
  "membership",
  "locked",
];

export const EPISODE_PRIMARY_STATE_META = {
  free: {
    stateLabel: "Free",
    stateTone: "free",
    summaryLabel: "free",
    filterLabel: "Free",
  },
  preview: {
    stateLabel: "Preview",
    stateTone: "preview",
    summaryLabel: "preview",
    filterLabel: "Preview",
  },
  points: {
    stateLabel: "Unlock with points",
    stateTone: "points",
    summaryLabel: "unlock with points",
    filterLabel: "Unlock with points",
  },
  membership: {
    stateLabel: "Included with membership",
    stateTone: "membership",
    summaryLabel: "included with membership",
    filterLabel: "Included with membership",
  },
  locked: {
    stateLabel: "Locked",
    stateTone: "locked",
    summaryLabel: "locked",
    filterLabel: "Locked",
  },
};

function sortEpisodesByNumber(episodes = []) {
  return [...episodes].sort(
    (left, right) => Number(left?.number || 0) - Number(right?.number || 0),
  );
}

function toEpisodeStateList(episodeStateMap) {
  if (episodeStateMap instanceof Map) {
    return Array.from(episodeStateMap.values()).filter(Boolean);
  }

  if (Array.isArray(episodeStateMap)) {
    return episodeStateMap.filter(Boolean);
  }

  return [];
}

function buildEpisodeAvailabilityExplainer(counts, hasCountdown) {
  if (counts.free > 0 && counts.preview > 0) {
    return "Start with free chapters and previews. Later episodes unlock with points or membership.";
  }

  if (counts.free > 0) {
    return counts.points > 0 || counts.membership > 0 || counts.locked > 0
      ? "Start with free chapters. Later episodes unlock with points or membership."
      : "Start with the free chapters on this page.";
  }

  if (counts.preview > 0) {
    return "Read previews first. Full episodes unlock with points or membership.";
  }

  if (counts.points > 0 && hasCountdown) {
    return "Unlock now with points, or wait for timed openings on eligible episodes.";
  }

  if (counts.points > 0 && counts.membership > 0) {
    return "Use points for standard unlocks, or membership on eligible episodes.";
  }

  if (counts.membership > 0) {
    return counts.points > 0
      ? "Membership covers eligible episodes. The rest unlock with points."
      : "Membership covers the main episode access on this page.";
  }

  if (hasCountdown) {
    return "Some episodes open later on a timer. Check the countdown before you come back.";
  }

  if (counts.points > 0) {
    return "Episodes on this page unlock with points.";
  }

  return "Episodes on this page are locked right now.";
}

function getEpisodeEntryLabel(firstState, counts, hasCountdown) {
  if (!firstState) {
    return "Episodes";
  }

  if (firstState.kind === "unlocked") {
    return "Continue reading";
  }

  if (firstState.primaryState === "free") {
    return "Read free";
  }

  if (firstState.primaryState === "preview") {
    return "Preview available";
  }

  if (firstState.primaryState === "membership") {
    return "Included with membership";
  }

  if (firstState.primaryState === "points") {
    return hasCountdown && counts.free === 0 && counts.preview === 0
      ? "Unlock now or wait"
      : "Unlock with points";
  }

  if (hasCountdown) {
    return "Available later";
  }

  return "Locked for now";
}

function getEpisodeAvailabilityBadge(counts, hasCountdown) {
  if (counts.free > 0) {
    return `${counts.free.toLocaleString()} free`;
  }

  if (counts.preview > 0) {
    return `${counts.preview.toLocaleString()} preview`;
  }

  if (counts.membership > 0) {
    return "Membership included";
  }

  if (counts.points > 0) {
    return "Point unlocks";
  }

  if (hasCountdown) {
    return "Timed access";
  }

  if (counts.locked > 0) {
    return "Locked";
  }

  return "";
}

export function formatEpisodeCountdown(ms) {
  const safeMs = Math.max(0, Number(ms || 0));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function toPrice(value, fallback = 0) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return Number(fallback || 0);
}

function buildEpisodeAccessState(primaryState, overrides = {}) {
  const meta = EPISODE_PRIMARY_STATE_META[primaryState] || EPISODE_PRIMARY_STATE_META.locked;
  return {
    primaryState,
    stateLabel: meta.stateLabel,
    stateTone: meta.stateTone,
    summaryLabel: meta.summaryLabel,
    ...overrides,
  };
}

export function getEpisodeAccessState({
  episode,
  unlocked = false,
  subscription = null,
  subscriptionUsage = null,
  coupons = [],
  nowMs = Date.now(),
  fallbackPrice = 0,
}) {
  const basePrice = toPrice(episode?.pricePts, fallbackPrice);
  const previewPages = Number(episode?.previewFreePages || 0);
  const hasPreview = previewPages > 0;
  const readyAtMs = episode?.ttfReadyAt ? Date.parse(episode.ttfReadyAt) : null;
  const hasTtf = Boolean(episode?.ttfEligible);
  const isTtfReady = hasTtf ? !readyAtMs || readyAtMs <= nowMs : false;
  const pricing = calculatePrice({
    basePrice,
    subscription: subscription?.active ? subscription : null,
    coupons,
    method: "WALLET",
    applyDailyFree: Boolean(subscriptionUsage?.remaining),
  });
  const effectivePrice = Number(pricing.finalPrice ?? basePrice);
  const countdownMs = readyAtMs ? Math.max(0, readyAtMs - nowMs) : null;
  const discountLabel =
    pricing.appliedCoupon?.label ||
    (pricing.discountPct ? `Member ${pricing.discountPct}% off` : "");

  if (unlocked) {
    return buildEpisodeAccessState("free", {
      kind: "unlocked",
      actionLabel: "Continue Reading",
      actionKind: "read",
      pricing,
      effectivePrice,
      basePrice,
      previewPages,
      countdownMs,
      shortLabel: "Already unlocked",
      helperText: "This episode is already unlocked on this account.",
      supportLabel: "",
      supportTone: "muted",
    });
  }

  if (pricing.appliedDailyFree) {
    return buildEpisodeAccessState("membership", {
      kind: "membership",
      actionLabel: "Included with Membership",
      actionKind: "unlock",
      claimRequired: false,
      pricing,
      effectivePrice,
      basePrice,
      previewPages,
      countdownMs,
      shortLabel: "Membership included",
      helperText: "This episode is included with membership right now.",
      supportLabel: "",
      supportTone: "muted",
    });
  }

  if (basePrice === 0 || effectivePrice === 0 || (hasTtf && isTtfReady)) {
    const claimRequired = Boolean(hasTtf && isTtfReady);
    return buildEpisodeAccessState("free", {
      kind: "free",
      actionLabel: "Read Free",
      actionKind: claimRequired ? "claim" : "read",
      claimRequired,
      pricing,
      effectivePrice,
      basePrice,
      previewPages,
      countdownMs,
      shortLabel: "Read free now",
      helperText: hasTtf && isTtfReady
        ? "This timed unlock is ready right now."
        : "This episode is free to read right now.",
      supportLabel: "",
      supportTone: "muted",
    });
  }

  if (hasPreview) {
    return buildEpisodeAccessState("preview", {
      kind: "preview",
      actionLabel: "Read Free",
      actionKind: "preview",
      claimRequired: false,
      pricing,
      effectivePrice,
      basePrice,
      previewPages,
      countdownMs,
      shortLabel: `${previewPages} preview page${previewPages === 1 ? "" : "s"}`,
      helperText:
        effectivePrice > 0
          ? `Read ${previewPages} preview page${previewPages === 1 ? "" : "s"} now. Unlock the full episode with points or membership when you are ready.`
          : `Read ${previewPages} preview page${previewPages === 1 ? "" : "s"} right now.`,
      supportLabel: effectivePrice > 0 ? `Unlock full episode with ${effectivePrice} points` : "",
      supportTone: effectivePrice > 0 ? "points" : "muted",
    });
  }

  if (effectivePrice > 0) {
    return buildEpisodeAccessState("points", {
      kind: "points",
      actionLabel: "Unlock with Points",
      actionKind: "unlock",
      claimRequired: false,
      pricing,
      effectivePrice,
      basePrice,
      previewPages,
      countdownMs,
      shortLabel: `${effectivePrice} points`,
      helperText:
        hasTtf && !isTtfReady && countdownMs
          ? `Unlock now with ${effectivePrice} points, or wait ${formatEpisodeCountdown(countdownMs)} for timed access.`
          : `Unlock this episode with ${effectivePrice} points.`,
      supportLabel:
        hasTtf && !isTtfReady && countdownMs
          ? `Available in ${formatEpisodeCountdown(countdownMs)}`
          : subscription?.active && discountLabel
            ? discountLabel
            : subscription?.active
              ? "Membership discount active"
              : "",
      supportTone:
        hasTtf && !isTtfReady && countdownMs
          ? "muted"
          : subscription?.active
            ? "membership"
            : "muted",
    });
  }

  if (hasTtf && !isTtfReady) {
    return buildEpisodeAccessState("locked", {
      kind: "locked",
      actionLabel: "Join Membership",
      actionKind: "subscribe",
      claimRequired: false,
      pricing,
      effectivePrice,
      basePrice,
      previewPages,
      countdownMs,
      shortLabel: countdownMs ? `Available in ${formatEpisodeCountdown(countdownMs)}` : "Locked",
      helperText: "This episode opens later on a timer.",
      supportLabel: "",
      supportTone: "muted",
    });
  }

  return buildEpisodeAccessState("locked", {
    kind: "locked",
    actionLabel: "Join Membership",
    actionKind: "subscribe",
    claimRequired: false,
    pricing,
    effectivePrice,
    basePrice,
    previewPages,
    countdownMs,
    shortLabel: "Locked",
    helperText: "This episode is locked right now.",
    supportLabel: "",
    supportTone: "muted",
  });
}

export function buildEpisodeAccessStateMap({
  episodes = [],
  unlockedEpisodeIds = [],
  subscription = null,
  subscriptionUsage = null,
  coupons = [],
  nowMs = Date.now(),
  fallbackPrice = 0,
}) {
  const unlockedSet = new Set(Array.isArray(unlockedEpisodeIds) ? unlockedEpisodeIds : []);
  const map = new Map();

  (Array.isArray(episodes) ? episodes : []).forEach((episode) => {
    map.set(
      episode?.id,
      getEpisodeAccessState({
        episode,
        unlocked: unlockedSet.has(episode?.id),
        subscription,
        subscriptionUsage,
        coupons,
        nowMs,
        fallbackPrice,
      }),
    );
  });

  return map;
}

export function getEpisodeAvailabilityCounts(episodeStateMap) {
  const counts = Object.fromEntries(
    EPISODE_PRIMARY_STATE_ORDER.map((state) => [state, 0]),
  );

  toEpisodeStateList(episodeStateMap).forEach((state) => {
    const key = state?.primaryState || "locked";
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

export function getEpisodeAvailabilitySummary({
  episodes = [],
  episodeStateMap,
}) {
  const counts = getEpisodeAvailabilityCounts(episodeStateMap);
  const states = toEpisodeStateList(episodeStateMap);
  const hasCountdown = states.some((state) => Number(state?.countdownMs || 0) > 0);
  const summaryItems = EPISODE_PRIMARY_STATE_ORDER.filter(
    (state) => counts[state] > 0,
  ).map(
    (state) =>
      `${counts[state].toLocaleString()} ${EPISODE_PRIMARY_STATE_META[state].summaryLabel}`,
  );
  const sortedEpisodes = sortEpisodesByNumber(Array.isArray(episodes) ? episodes : []);
  const firstEpisode = sortedEpisodes[0] || null;
  const firstState = firstEpisode
    ? episodeStateMap?.get?.(firstEpisode.id) || null
    : null;
  const explainer = buildEpisodeAvailabilityExplainer(counts, hasCountdown);

  return {
    counts,
    summaryItems,
    mobileSummary: summaryItems.join(" | "),
    explainer,
    hasCountdown,
    startsFree: counts.free > 0 || counts.preview > 0,
    heroBadgeLabel:
      counts.free > 0 ? "Starts free" : counts.preview > 0 ? "Preview available" : "",
    badgeLabel: getEpisodeAvailabilityBadge(counts, hasCountdown),
    entryLabel: getEpisodeEntryLabel(firstState, counts, hasCountdown),
    entryHint: firstState?.helperText || explainer,
    firstState,
  };
}

export function getSeriesPrimaryReadAction({
  series,
  episodes = [],
  progress = null,
  unlockedEpisodeIds = [],
  subscription = null,
  subscriptionUsage = null,
  coupons = [],
  nowMs = Date.now(),
}) {
  const list = Array.isArray(episodes)
    ? [...episodes].sort((left, right) => Number(left?.number || 0) - Number(right?.number || 0))
    : [];
  const progressEpisode = progress?.lastEpisodeId
    ? list.find((episode) => episode?.id === progress.lastEpisodeId)
    : null;

  if (progressEpisode) {
    return {
      type: "continue",
      label: "Continue Reading",
      episodeId: progressEpisode.id,
      actionKind: "read",
      note:
        progress?.percent && progress.percent > 0
          ? `Pick up where you stopped in Episode ${progressEpisode.number}.`
          : `Resume Episode ${progressEpisode.number}.`,
    };
  }

  const firstEpisode = list[0] || null;
  if (!firstEpisode) {
    return {
      type: "browse",
      label: "Join Membership",
      episodeId: null,
      actionKind: "subscribe",
      note: "Episodes will appear here as the series expands.",
    };
  }

  const state = getEpisodeAccessState({
    episode: firstEpisode,
    unlocked: unlockedEpisodeIds.includes(firstEpisode.id),
    subscription,
    subscriptionUsage,
    coupons,
    nowMs,
    fallbackPrice: series?.pricing?.episodePrice ?? 0,
  });

  if (state.kind === "unlocked") {
    return {
      type: "continue",
      label: "Continue Reading",
      episodeId: firstEpisode.id,
      actionKind: "read",
      note: state.helperText,
    };
  }

  if (state.primaryState === "free" || state.primaryState === "preview") {
    return {
      type: state.primaryState,
      label: "Read Free",
      episodeId: firstEpisode.id,
      actionKind: state.actionKind,
      note: state.helperText,
    };
  }

  if (state.primaryState === "membership") {
    return {
      type: "membership",
      label: "Included with Membership",
      episodeId: firstEpisode.id,
      actionKind: state.actionKind,
      note: state.helperText,
    };
  }

  if (state.primaryState === "points") {
    return {
      type: "points",
      label: "Unlock with Points",
      episodeId: firstEpisode.id,
      actionKind: state.actionKind,
      note: state.helperText,
    };
  }

  return {
    type: "locked",
    label: state.actionLabel || "Join Membership",
    episodeId: firstEpisode.id,
    actionKind: state.actionKind,
    note: state.helperText,
  };
}
