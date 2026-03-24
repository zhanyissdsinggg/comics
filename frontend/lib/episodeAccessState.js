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
    return "Start here, then unlock later.";
  }

  if (counts.free > 0) {
    return counts.points > 0 || counts.membership > 0 || counts.locked > 0
      ? "Start here, then unlock later."
      : "Start here.";
  }

  if (counts.preview > 0) {
    return "Preview first, then unlock.";
  }

  if (counts.points > 0 && hasCountdown) {
    return "Unlock now, or wait.";
  }

  if (counts.points > 0 && counts.membership > 0) {
    return "Use points, or membership where included.";
  }

  if (counts.membership > 0) {
    return counts.points > 0
      ? "Membership covers eligible episodes."
      : "Membership included.";
  }

  if (hasCountdown) {
    return "Some episodes open later.";
  }

  if (counts.points > 0) {
    return "Unlock with points.";
  }

  return "Locked right now.";
}

function getEpisodeEntryLabel(firstState, counts, hasCountdown) {
  if (!firstState) {
    return "Episodes";
  }

  if (firstState.kind === "unlocked") {
    return "Continue reading";
  }

  if (firstState.primaryState === "free") {
    return "Start at Episode 1";
  }

  if (firstState.primaryState === "preview") {
    return "Preview first";
  }

  if (firstState.primaryState === "membership") {
    return "Membership access";
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
    return "Start here";
  }

  if (counts.preview > 0) {
    return "Preview";
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
      shortLabel: "",
      helperText: "",
      rowHelperText: "",
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
      shortLabel: "",
      helperText: "",
      rowHelperText: "",
      supportLabel: "",
      supportTone: "muted",
    });
  }

  if (basePrice === 0 || effectivePrice === 0 || (hasTtf && isTtfReady)) {
    const claimRequired = Boolean(hasTtf && isTtfReady);
    return buildEpisodeAccessState("free", {
      kind: "free",
      actionLabel: "Read",
      actionKind: claimRequired ? "claim" : "read",
      claimRequired,
      pricing,
      effectivePrice,
      basePrice,
      previewPages,
      countdownMs,
      shortLabel: "",
      helperText: "",
      rowHelperText: "",
      supportLabel: "",
      supportTone: "muted",
    });
  }

  if (hasPreview) {
    return buildEpisodeAccessState("preview", {
      kind: "preview",
      actionLabel: "Preview Episode",
      actionKind: "preview",
      claimRequired: false,
      pricing,
      effectivePrice,
      basePrice,
      previewPages,
      countdownMs,
      shortLabel: `${previewPages} page${previewPages === 1 ? "" : "s"}`,
      helperText: "",
      rowHelperText:
        effectivePrice > 0
          ? `Preview ${previewPages} page${previewPages === 1 ? "" : "s"}, then unlock later.`
          : `Preview ${previewPages} page${previewPages === 1 ? "" : "s"}.`,
      supportLabel: effectivePrice > 0 ? `Full unlock: ${effectivePrice} points` : "",
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
      shortLabel: `${effectivePrice} pts`,
      helperText: "",
      rowHelperText:
        hasTtf && !isTtfReady && countdownMs
          ? `Or wait ${formatEpisodeCountdown(countdownMs)}.`
          : "",
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
      shortLabel: countdownMs ? `In ${formatEpisodeCountdown(countdownMs)}` : "Locked",
      helperText: "",
      rowHelperText: "This episode opens later.",
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
    helperText: "",
    rowHelperText: "Membership or points required.",
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
    mobileSummary: summaryItems.slice(0, 2).join(" / "),
    explainer,
    hasCountdown,
    startsFree: counts.free > 0 || counts.preview > 0,
    heroBadgeLabel:
      counts.free > 0 ? "Start here" : counts.preview > 0 ? "Preview" : "",
    badgeLabel: getEpisodeAvailabilityBadge(counts, hasCountdown),
    entryLabel: getEpisodeEntryLabel(firstState, counts, hasCountdown),
    entryHint: explainer,
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
      note: `Resume Episode ${progressEpisode.number}.`,
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
      note: "",
    };
  }

  if (state.primaryState === "free" || state.primaryState === "preview") {
    return {
      type: state.primaryState,
      label: state.primaryState === "preview" ? "Preview Episode 1" : "Read Episode 1",
      episodeId: firstEpisode.id,
      actionKind: state.actionKind,
      note: "",
    };
  }

  if (state.primaryState === "membership") {
    return {
      type: "membership",
      label: "Included with Membership",
      episodeId: firstEpisode.id,
      actionKind: state.actionKind,
      note: "",
    };
  }

  if (state.primaryState === "points") {
    return {
      type: "points",
      label: "Unlock with Points",
      episodeId: firstEpisode.id,
      actionKind: state.actionKind,
      note: "",
    };
  }

  return {
    type: "locked",
    label: state.actionLabel || "Join Membership",
    episodeId: firstEpisode.id,
    actionKind: state.actionKind,
    note: "",
  };
}
