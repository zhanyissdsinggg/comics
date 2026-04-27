import process from "node:process";

const DEFAULT_LIVE_URL = "https://www.gushcomics.com";
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_PROBE_RETRY_ATTEMPTS = 2;
const DEFAULT_PROBE_RETRY_INTERVAL_MS = 500;
const DEFAULT_ROUNDS = 3;
const DEFAULT_INTERVAL_MS = 3_000;
const DEFAULT_IGNORE_WARMUP_ROUNDS = 1;
const DEFAULT_MAX_ENDPOINT_P95_MS = 2_500;
const DEFAULT_MAX_FRONTEND_P95_MS = 3_500;
const DEFAULT_MAX_OBS_ERROR_RATE_PCT = 2;
const DEFAULT_MAX_OBS_P95_MS = 1_200;
const CREATOR_FALLBACK_LABEL = "Creator details coming soon";
const CREATOR_FALLBACK_DETAIL = "Public creator names have not been listed on this title yet.";
const LEGACY_TERMS = [
  "Top Series",
  "Read Free",
  "Fresh pick",
  "Point packs",
  "Membership",
  "Unlock as you go",
  "4.6 stars",
  "4.7 stars",
  "4.4(742)",
  "HOT",
  "Trending",
  "Creator shelf",
  "Creator shelves",
  "Story team",
  "The team behind",
];
const DEFAULT_FORBIDDEN_TERMS = [
  // US region: never leak CNY/RMB pricing hints in storefront surfaces.
  "CNY",
  "RMB",
  "人民币",
  "￥",
  "¥",
];
const AUDIT_FORBIDDEN_TERMS = readCsv("OPS_AUDIT_FORBIDDEN_TERMS", DEFAULT_FORBIDDEN_TERMS);

function readNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readCsv(name, fallback = []) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) {
    return [...fallback];
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function ensureLeadingSlash(path) {
  const raw = String(path || "").trim();
  if (!raw) {
    return "/";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function percentile(values, p) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const index = Math.max(0, Math.min(sorted.length - 1, rank));
  return sorted[index];
}

function commitMatches(actual, expected) {
  const left = String(actual || "").trim().toLowerCase();
  const right = String(expected || "").trim().toLowerCase();
  if (!left || !right) {
    return false;
  }
  return left.startsWith(right) || right.startsWith(left);
}

function normalizeSmartPunctuation(value) {
  return String(value || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

function normalizeText(value) {
  return normalizeSmartPunctuation(
    String(value || "")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function includesText(haystack, needle) {
  return normalizeText(haystack).toLowerCase().includes(normalizeText(needle).toLowerCase());
}

function readHeader(headers, key) {
  return String(headers?.[String(key || "").toLowerCase()] || "").trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolvePublicCreatorLabel(series) {
  const directCreator = String(series?.creator?.label || "").trim();
  if (directCreator) {
    return directCreator;
  }

  if (Array.isArray(series?.creatorCredits)) {
    const credits = series.creatorCredits
      .map((entry) => String(entry?.name || "").trim())
      .filter(Boolean);

    if (credits.length > 0) {
      return credits.join(", ");
    }
  }

  return String(series?.author || "").trim();
}

function hasPublicCreatorCredit(series) {
  return Boolean(resolvePublicCreatorLabel(series));
}

function getSeriesById(seriesList, seriesId) {
  return (Array.isArray(seriesList) ? seriesList : []).find(
    (series) => String(series?.id || "") === seriesId,
  ) || null;
}

function buildFrontendAuditSpecs(seriesCatalog) {
  const hasRealCreators = (Array.isArray(seriesCatalog) ? seriesCatalog : []).some((series) =>
    hasPublicCreatorCredit(series),
  );
  const homeRequired = readCsv("OPS_AUDIT_HOME_REQUIRED", [
    "Start with a story worth opening.",
    "Featured",
    "Comics",
    "Novels",
    "Creators",
  ]);
  const rankingsRequired = readCsv("OPS_AUDIT_RANKINGS_REQUIRED", [
    "Featured",
    "Editor's shelf",
    "Views",
  ]);
  const creatorsRequiredWithRealData = readCsv("OPS_AUDIT_CREATORS_REQUIRED", [
    "Creators",
    "All Creators",
    "Featured",
  ]);
  const creatorsRequiredFallback = readCsv("OPS_AUDIT_CREATORS_FALLBACK_REQUIRED", [
    "Creators",
    "All Creators",
  ]);
  const specs = [
    {
      route: "/",
      required: homeRequired,
      forbidden: [...LEGACY_TERMS, ...AUDIT_FORBIDDEN_TERMS],
    },
    // Storefront purchase surfaces must never show CNY/RMB in US deployments.
    // We intentionally do NOT apply LEGACY_TERMS here because purchase pages
    // legitimately contain commerce language.
    {
      route: "/store",
      requiredAny: [["Point options", "Pick a plan", "Buy now", "Store"]],
      forbidden: [...AUDIT_FORBIDDEN_TERMS],
    },
    {
      route: "/subscribe",
      requiredAny: [["Plans", "Choose plan", "Monthly"]],
      forbidden: [...AUDIT_FORBIDDEN_TERMS],
    },
    {
      route: "/rankings",
      required: rankingsRequired,
      forbidden: [...LEGACY_TERMS, ...AUDIT_FORBIDDEN_TERMS, "Rank #", "All time", "Weekly", "Monthly"],
    },
    hasRealCreators
      ? {
          route: "/creators",
          required: creatorsRequiredWithRealData,
          forbidden: [
            ...AUDIT_FORBIDDEN_TERMS,
            "Story team",
            "The team behind",
            CREATOR_FALLBACK_LABEL,
            CREATOR_FALLBACK_DETAIL,
          ],
        }
      : {
          route: "/creators",
          required: creatorsRequiredFallback,
          forbidden: [...AUDIT_FORBIDDEN_TERMS, "Story team", "The team behind", "Featured Creators"],
        },
  ];

  // Demo route must be stable in production so we always have a reliable reader smoke target.
  const demoSeriesId = String(process.env.OPS_SMOKE_SERIES_ID || "demo-series").trim() || "demo-series";
  specs.push({
    route: `/series/${demoSeriesId}`,
    required: ["Demo Series"],
    requiredAny: [["Read Chapter 1", "Start Reading", "Continue Reading"]],
    forbidden: [...LEGACY_TERMS, ...AUDIT_FORBIDDEN_TERMS],
  });

  for (const seriesId of ["series-008", "series-010", "series-005"]) {
    const series = getSeriesById(seriesCatalog, seriesId);
    if (!series) {
      continue;
    }

    specs.push({
      route: `/series/${seriesId}`,
      required: [
        String(series.title || "").trim(),
        hasPublicCreatorCredit(series) ? resolvePublicCreatorLabel(series) : CREATOR_FALLBACK_LABEL,
      ].filter(Boolean),
      requiredAny: [["Read Chapter 1", "Start Reading", "Continue Reading"]],
      forbidden: hasPublicCreatorCredit(series)
        ? [...LEGACY_TERMS, ...AUDIT_FORBIDDEN_TERMS, CREATOR_FALLBACK_LABEL, CREATOR_FALLBACK_DETAIL]
        : [...LEGACY_TERMS, ...AUDIT_FORBIDDEN_TERMS],
    });
  }

  return specs;
}

async function timedFetch(url, options = {}) {
  const timeoutMs = readNumber("OPS_REQUEST_TIMEOUT_MS", DEFAULT_REQUEST_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/html;q=0.9, */*;q=0.8",
        ...(options.headers || {}),
      },
    });
    const durationMs = Date.now() - startedAt;
    const text = await response.text();
    let body = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      durationMs,
      headers: Object.fromEntries(response.headers.entries()),
      text,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      headers: {},
      text: "",
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeWithRetry(url, options = {}) {
  const attempts = readNumber("OPS_PROBE_RETRY_ATTEMPTS", DEFAULT_PROBE_RETRY_ATTEMPTS);
  const retryIntervalMs = readNumber("OPS_PROBE_RETRY_INTERVAL_MS", DEFAULT_PROBE_RETRY_INTERVAL_MS);
  const maxAttempts = Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 1;
  let lastResult = null;

  for (let index = 1; index <= maxAttempts; index += 1) {
    const result = await timedFetch(url, options);
    lastResult = result;

    const shouldRetry = !result.ok && (result.status === 0 || result.status >= 500);
    if (!shouldRetry || index >= maxAttempts) {
      return result;
    }

    await sleep(retryIntervalMs);
  }

  return lastResult || {
    ok: false,
    status: 0,
    durationMs: 0,
    headers: {},
    text: "",
    body: null,
    error: "probe failed",
  };
}

async function run() {
  const backendBaseUrl = normalizeBaseUrl(process.env.BACKEND_URL) || DEFAULT_LIVE_URL;
  const frontendBaseUrl = normalizeBaseUrl(process.env.FRONTEND_URL) || DEFAULT_LIVE_URL;
  const expectedBackendCommit = String(process.env.EXPECT_BACKEND_COMMIT || "").trim();
  const expectedFrontendCommit = String(process.env.EXPECT_FRONTEND_COMMIT || "").trim();
  const expectedFrontendRepo = String(process.env.EXPECT_FRONTEND_REPO || "").trim();
  const expectedFrontendBranch = String(process.env.EXPECT_FRONTEND_BRANCH || "").trim();
  const observabilityKey = String(process.env.OBSERVABILITY_KEY || "").trim();
  const observabilityRequired = process.env.OBS_REQUIRED === "1";
  const requireAdvancedHealth = process.env.OPS_REQUIRE_ADVANCED_HEALTH === "1";
  const strictContentAudit = process.env.OPS_STRICT_CONTENT_AUDIT === "1";

  const rounds = readNumber("OPS_ROUNDS", DEFAULT_ROUNDS);
  const intervalMs = readNumber("OPS_INTERVAL_MS", DEFAULT_INTERVAL_MS);
  const ignoreWarmupRounds = readNumber("OPS_IGNORE_WARMUP_ROUNDS", DEFAULT_IGNORE_WARMUP_ROUNDS);
  const maxEndpointP95Ms = readNumber("OPS_MAX_ENDPOINT_P95_MS", DEFAULT_MAX_ENDPOINT_P95_MS);
  const maxFrontendP95Ms = readNumber("OPS_MAX_FRONTEND_P95_MS", DEFAULT_MAX_FRONTEND_P95_MS);
  const allowedFrontendSlowSamples = readNumber("OPS_ALLOWED_FRONTEND_SLOW_SAMPLES", 1);
  const allowedBackendSlowSamples = readNumber("OPS_ALLOWED_BACKEND_SLOW_SAMPLES", 1);
  const allowedTransientFailures = readNumber("OPS_ALLOWED_TRANSIENT_FAILURES", 1);
  const maxObsErrorRatePct = readNumber(
    "OPS_MAX_OBS_ERROR_RATE_PCT",
    DEFAULT_MAX_OBS_ERROR_RATE_PCT,
  );
  const maxObsP95Ms = readNumber("OPS_MAX_OBS_P95_MS", DEFAULT_MAX_OBS_P95_MS);

  const frontendRoutes = String(process.env.FRONTEND_ROUTES || "/,/creators,/rankings,/series/series-008")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(ensureLeadingSlash);

  const smokeSeriesId = String(process.env.OPS_SMOKE_SERIES_ID || "demo-series").trim() || "demo-series";
  const smokeEpisodeId = String(process.env.OPS_SMOKE_EPISODE_ID || "demo-episode").trim() || "demo-episode";

  const backendPaths = [
    { path: "/api/health", required: true },
    { path: "/api/health/live", required: false },
    { path: "/api/health/ready", required: requireAdvancedHealth },
    { path: "/api/health/detail", required: requireAdvancedHealth },
    { path: "/api/meta/version", required: true },
    { path: "/api/series?adult=0", required: true },
    // Keep a stable demo reader target in prod so UI smoke tests always have a known-good story.
    { path: `/api/series/${encodeURIComponent(smokeSeriesId)}?adult=0`, required: true },
    {
      path: `/api/episode?seriesId=${encodeURIComponent(smokeSeriesId)}&episodeId=${encodeURIComponent(smokeEpisodeId)}`,
      required: true,
    },
  ];

  const latencyByRoute = new Map();
  const successCountByRoute = new Map();
  const requiredByRoute = new Map();
  const failureCountByRoute = new Map();
  const failureExampleByRoute = new Map();
  const failures = [];
  const warnings = [];
  let latestVersion = null;
  let publicCatalog = [];
  let frontendIdentity = null;

  console.log(`[ops] post-deploy verification started (rounds=${rounds})`);
  console.log(`[ops] backend=${backendBaseUrl}`);
  if (frontendBaseUrl) {
    console.log(`[ops] frontend=${frontendBaseUrl}`);
  }
  if (expectedBackendCommit) {
    console.log(`[ops] expected backend commit=${expectedBackendCommit}`);
  }
  if (expectedFrontendCommit) {
    console.log(`[ops] expected frontend commit=${expectedFrontendCommit}`);
  }
  if (expectedFrontendRepo) {
    console.log(`[ops] expected frontend repo=${expectedFrontendRepo}`);
  }
  if (expectedFrontendBranch) {
    console.log(`[ops] expected frontend branch=${expectedFrontendBranch}`);
  }

  for (let round = 1; round <= rounds; round += 1) {
    console.log(`[ops] round ${round}/${rounds}`);

    for (const endpoint of backendPaths) {
      const { path, required } = endpoint;
      const routeKey = `backend ${path}`;
      requiredByRoute.set(routeKey, required);
      const url = `${backendBaseUrl}${path}`;
      const result = await probeWithRetry(url);

      if (!result.ok) {
        const requestId = readHeader(result.headers, "x-request-id");
        const failureMessage = `${routeKey} failed: status=${result.status}, durationMs=${result.durationMs}, error=${
          result.error || "n/a"
        }, requestId=${requestId || "n/a"}`;
        if (!required && result.status === 404) {
          warnings.push(`${routeKey} unavailable (404) but optional in current mode`);
          continue;
        }
        failureCountByRoute.set(routeKey, (failureCountByRoute.get(routeKey) || 0) + 1);
        failureExampleByRoute.set(routeKey, failureMessage);
      } else {
        successCountByRoute.set(routeKey, (successCountByRoute.get(routeKey) || 0) + 1);
        if (!latencyByRoute.has(routeKey)) {
          latencyByRoute.set(routeKey, []);
        }
        latencyByRoute.get(routeKey).push(result.durationMs);
        console.log(`[ops] ${routeKey} -> ${result.status} (${result.durationMs}ms)`);
      }

      if (path === "/api/meta/version" && result.body && typeof result.body === "object") {
        latestVersion = result.body;
      }

      if (path === "/api/series?adult=0" && Array.isArray(result.body?.series)) {
        publicCatalog = result.body.series;
      }
    }

    if (frontendBaseUrl) {
      for (const route of frontendRoutes) {
        const routeKey = `frontend ${route}`;
        requiredByRoute.set(routeKey, true);
        const url = `${frontendBaseUrl}${route}`;
        const result = await probeWithRetry(url, {
          headers: {
            Accept: "text/html,application/xhtml+xml",
          },
        });

        if (!result.ok) {
          const requestId = readHeader(result.headers, "x-request-id");
          const failureMessage = `${routeKey} failed: status=${result.status}, durationMs=${result.durationMs}, error=${
            result.error || "n/a"
          }, requestId=${requestId || "n/a"}`;
          failureCountByRoute.set(routeKey, (failureCountByRoute.get(routeKey) || 0) + 1);
          failureExampleByRoute.set(routeKey, failureMessage);
        } else {
          successCountByRoute.set(routeKey, (successCountByRoute.get(routeKey) || 0) + 1);
          if (!latencyByRoute.has(routeKey)) {
            latencyByRoute.set(routeKey, []);
          }
          latencyByRoute.get(routeKey).push(result.durationMs);
          console.log(`[ops] ${routeKey} -> ${result.status} (${result.durationMs}ms)`);
          if (!frontendIdentity) {
            frontendIdentity = {
              revision: readHeader(result.headers, "x-gush-frontend-revision"),
              repo: readHeader(result.headers, "x-gush-frontend-repo"),
              branch: readHeader(result.headers, "x-gush-frontend-branch"),
              deployment: readHeader(result.headers, "x-gush-frontend-deployment"),
            };
          }
        }
      }
    }

    if (round < rounds) {
      await sleep(intervalMs);
    }
  }

  for (const [routeKey, count] of failureCountByRoute.entries()) {
    const required = requiredByRoute.get(routeKey) !== false;
    if (!required) {
      warnings.push(`${routeKey} had ${count} failed probe(s) but is optional`);
      continue;
    }

    if (count > allowedTransientFailures) {
      failures.push(
        `${routeKey} failed ${count} probe(s), allowance=${allowedTransientFailures}. ${
          failureExampleByRoute.get(routeKey) || ""
        }`.trim(),
      );
    } else {
      warnings.push(
        `${routeKey} transient failure tolerated (${count}/${allowedTransientFailures})`,
      );
    }
  }

  for (const [routeKey, samples] of latencyByRoute.entries()) {
    const required = requiredByRoute.get(routeKey) !== false;
    const successCount = successCountByRoute.get(routeKey) || 0;
    if (!required && successCount === 0) {
      console.log(`[ops] latency ${routeKey}: skipped (optional route unavailable)`);
      continue;
    }
    const effectiveSamples =
      samples.length > ignoreWarmupRounds ? samples.slice(ignoreWarmupRounds) : samples;
    const p95 = percentile(effectiveSamples, 95);
    const isFrontendRoute = routeKey.startsWith("frontend ");
    const threshold = isFrontendRoute ? maxFrontendP95Ms : maxEndpointP95Ms;
    const slowSampleCount = effectiveSamples.filter((value) => value > threshold).length;
    if (p95 > threshold) {
      const isWithinTolerance = isFrontendRoute
        ? slowSampleCount <= allowedFrontendSlowSamples
        : slowSampleCount <= allowedBackendSlowSamples;
      if (isWithinTolerance) {
        warnings.push(
          `${routeKey} had ${slowSampleCount} slow sample(s) over ${threshold}ms, tolerated by allowance=${
            isFrontendRoute ? allowedFrontendSlowSamples : allowedBackendSlowSamples
          }`,
        );
      } else {
        failures.push(`${routeKey} p95=${p95}ms exceeds threshold ${threshold}ms`);
      }
    }
    console.log(
      `[ops] latency ${routeKey}: p50=${percentile(effectiveSamples, 50)}ms p95=${p95}ms p99=${percentile(
        effectiveSamples,
        99,
      )}ms (samples=${samples.length}, warmupIgnored=${Math.min(ignoreWarmupRounds, samples.length)})`,
    );
  }

  if (expectedBackendCommit) {
    const actualCommit = String(latestVersion?.commit || "").trim();
    if (!commitMatches(actualCommit, expectedBackendCommit)) {
      failures.push(
        `backend commit mismatch: expected=${expectedBackendCommit}, actual=${actualCommit || "unknown"}`,
      );
    } else {
      console.log(`[ops] backend commit matched: ${actualCommit}`);
    }
  }

  if (frontendBaseUrl) {
    const identityProbe = await probeWithRetry(`${frontendBaseUrl}/`, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (identityProbe.ok) {
      frontendIdentity = {
        revision: readHeader(identityProbe.headers, "x-gush-frontend-revision"),
        repo: readHeader(identityProbe.headers, "x-gush-frontend-repo"),
        branch: readHeader(identityProbe.headers, "x-gush-frontend-branch"),
        deployment: readHeader(identityProbe.headers, "x-gush-frontend-deployment"),
      };
    }

    if (!frontendIdentity) {
      failures.push("frontend identity headers missing on checked frontend routes");
    } else {
      console.log(
        `[ops] frontend identity: revision=${frontendIdentity.revision || "unknown"} repo=${
          frontendIdentity.repo || "unknown"
        } branch=${frontendIdentity.branch || "unknown"} deployment=${
          frontendIdentity.deployment || "unknown"
        }`,
      );
    }

    if (expectedFrontendCommit && !commitMatches(frontendIdentity?.revision, expectedFrontendCommit)) {
      failures.push(
        `frontend commit mismatch: expected=${expectedFrontendCommit}, actual=${
          frontendIdentity?.revision || "unknown"
        }`,
      );
    }

    if (expectedFrontendRepo) {
      const actualRepo = String(frontendIdentity?.repo || "").trim().toLowerCase();
      const normalizedExpectedRepo = expectedFrontendRepo.toLowerCase();
      if (!actualRepo || actualRepo !== normalizedExpectedRepo) {
        failures.push(
          `frontend repo mismatch: expected=${expectedFrontendRepo}, actual=${frontendIdentity?.repo || "unknown"}`,
        );
      }
    }

    if (expectedFrontendBranch) {
      const actualBranch = String(frontendIdentity?.branch || "").trim().toLowerCase();
      const normalizedExpectedBranch = expectedFrontendBranch.toLowerCase();
      if (!actualBranch || actualBranch !== normalizedExpectedBranch) {
        failures.push(
          `frontend branch mismatch: expected=${expectedFrontendBranch}, actual=${frontendIdentity?.branch || "unknown"}`,
        );
      }
    }

    if (strictContentAudit) {
      const frontendAuditSpecs = buildFrontendAuditSpecs(publicCatalog);
      for (const spec of frontendAuditSpecs) {
        const result = await probeWithRetry(`${frontendBaseUrl}${spec.route}`, {
          headers: {
            Accept: "text/html,application/xhtml+xml",
          },
        });

        if (!result.ok) {
          const requestId = readHeader(result.headers, "x-request-id");
          failures.push(
            `frontend content audit failed for ${spec.route}: status=${result.status}, error=${
              result.error || "n/a"
            }, requestId=${requestId || "n/a"}`,
          );
          continue;
        }

        const visibleText = normalizeText(result.text);

        for (const needle of spec.required || []) {
          if (!includesText(visibleText, needle)) {
            failures.push(`frontend route ${spec.route} missing required content: ${needle}`);
          }
        }

        for (const alternatives of spec.requiredAny || []) {
          if (!alternatives.some((needle) => includesText(visibleText, needle))) {
            failures.push(
              `frontend route ${spec.route} missing any acceptable content variant: ${alternatives.join(" | ")}`,
            );
          }
        }

        for (const needle of spec.forbidden || []) {
          if (includesText(visibleText, needle)) {
            failures.push(`frontend route ${spec.route} still exposes forbidden content: ${needle}`);
          }
        }
      }
    } else {
      warnings.push("frontend content audit skipped (set OPS_STRICT_CONTENT_AUDIT=1 to enable)");
    }
  }

  const observabilityHeaders = {};
  if (observabilityKey) {
    observabilityHeaders["x-observability-key"] = observabilityKey;
  }
  const observabilityResult = await probeWithRetry(`${backendBaseUrl}/api/meta/observability`, {
    headers: observabilityHeaders,
  });

  if (!observabilityResult.ok) {
    const missingAccessKeyHint =
      observabilityResult.status === 403 && !observabilityKey
        ? " (OBSERVABILITY_KEY missing)"
        : "";
    const message = `observability check skipped/failed: status=${observabilityResult.status}, error=${
      observabilityResult.error || "n/a"
    }${missingAccessKeyHint}`;
    if (observabilityRequired) {
      failures.push(message);
    } else {
      warnings.push(message);
    }
  } else if (observabilityResult.body && typeof observabilityResult.body === "object") {
    const errorRatePct = Number(observabilityResult.body?.requests?.errorRatePct || 0);
    const obsP95 = Number(observabilityResult.body?.latencyMs?.p95 || 0);
    console.log(
      `[ops] observability: errorRatePct=${errorRatePct.toFixed(
        2,
      )}, p95=${obsP95}ms, redis=${String(observabilityResult.body?.redis?.status || "unknown")}`,
    );

    if (errorRatePct > maxObsErrorRatePct) {
      failures.push(
        `observability errorRatePct ${errorRatePct.toFixed(
          2,
        )}% exceeds threshold ${maxObsErrorRatePct}%`,
      );
    }
    if (obsP95 > maxObsP95Ms) {
      failures.push(
        `observability latency p95 ${obsP95}ms exceeds threshold ${maxObsP95Ms}ms`,
      );
    }
  }

  for (const warning of warnings) {
    console.warn(`[ops] warning: ${warning}`);
  }

  if (failures.length > 0) {
    console.error("[ops] post-deploy verification failed:");
    for (const failure of failures) {
      console.error(`[ops] - ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[ops] post-deploy verification passed");
}

run().catch((error) => {
  console.error("[ops] post-deploy verification crashed", error);
  process.exit(1);
});
