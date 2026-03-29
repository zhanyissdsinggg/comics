import { Injectable } from "@nestjs/common";
import { getAppConfig, getObservabilityRuntimeConfig } from "../config/app-config";
import { logger } from "../logger/winston.init";

type RequestSnapshot = {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId?: string;
  timestamp: string;
};

export type FrontendErrorReportInput = {
  message?: unknown;
  boundaryName?: unknown;
  errorBoundary?: unknown;
  href?: unknown;
  digest?: unknown;
  userAgent?: unknown;
  stack?: unknown;
  componentStack?: unknown;
  timestamp?: unknown;
};

type FrontendErrorSnapshot = {
  message: string;
  boundaryName: string;
  href: string;
  digest?: string;
  userAgent?: string;
  stackPreview?: string;
  componentStackPreview?: string;
  timestamp: string;
};

type RouteStats = {
  count: number;
  errors: number;
  slow: number;
  totalDurationMs: number;
  maxDurationMs: number;
};

const MAX_RECENT_EVENTS = 100;
const MAX_LATENCY_SAMPLES = 2000;
const DEFAULT_SLOW_REQUEST_MS = 2000;
const DEFAULT_ALERT_SLOW_REQUEST_MS = 4000;
const DEFAULT_ALERT_COOLDOWN_MS = 60_000;

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(sortedValues: number[], p: number): number {
  if (!sortedValues.length) {
    return 0;
  }
  const rank = Math.ceil((p / 100) * sortedValues.length) - 1;
  const index = Math.max(0, Math.min(sortedValues.length - 1, rank));
  return sortedValues[index];
}

function sanitizeText(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

@Injectable()
export class ObservabilityService {
  private readonly startedAt = Date.now();
  private readonly runtimeConfig = getObservabilityRuntimeConfig();
  private readonly sentryEnabled = Boolean(this.runtimeConfig.sentryDsn);
  private readonly alertWebhook = this.runtimeConfig.alertWebhookUrl;
  private readonly slowRequestMs = toNumber(this.runtimeConfig.slowRequestMs, DEFAULT_SLOW_REQUEST_MS);
  private readonly alertSlowRequestMs = toNumber(
    this.runtimeConfig.alertSlowRequestMs,
    DEFAULT_ALERT_SLOW_REQUEST_MS,
  );
  private readonly alertCooldownMs = toNumber(
    this.runtimeConfig.alertCooldownMs,
    DEFAULT_ALERT_COOLDOWN_MS,
  );

  private totalRequests = 0;
  private totalErrors = 0;
  private totalSlowRequests = 0;
  private totalFrontendErrors = 0;
  private readonly statusBuckets = {
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
    other: 0,
  };
  private readonly latencySamples: number[] = [];
  private readonly recentErrors: RequestSnapshot[] = [];
  private readonly recentSlow: RequestSnapshot[] = [];
  private readonly recentFrontendErrors: FrontendErrorSnapshot[] = [];
  private readonly routeStats = new Map<string, RouteStats>();
  private readonly lastAlertAt = new Map<string, number>();

  recordRequest(input: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    requestId?: string;
  }): void {
    const method = String(input.method || "GET").toUpperCase();
    const path = String(input.path || "/");
    const statusCode = Number(input.statusCode || 0);
    const durationMs = Math.max(0, Math.round(Number(input.durationMs || 0)));

    this.totalRequests += 1;
    this.latencySamples.push(durationMs);
    if (this.latencySamples.length > MAX_LATENCY_SAMPLES) {
      this.latencySamples.shift();
    }

    if (statusCode >= 500) {
      this.statusBuckets["5xx"] += 1;
      this.totalErrors += 1;
    } else if (statusCode >= 400) {
      this.statusBuckets["4xx"] += 1;
    } else if (statusCode >= 300) {
      this.statusBuckets["3xx"] += 1;
    } else if (statusCode >= 200) {
      this.statusBuckets["2xx"] += 1;
    } else {
      this.statusBuckets.other += 1;
    }

    const routeKey = `${method} ${path}`;
    const existing = this.routeStats.get(routeKey) || {
      count: 0,
      errors: 0,
      slow: 0,
      totalDurationMs: 0,
      maxDurationMs: 0,
    };
    existing.count += 1;
    existing.totalDurationMs += durationMs;
    existing.maxDurationMs = Math.max(existing.maxDurationMs, durationMs);

    if (statusCode >= 500) {
      existing.errors += 1;
    }
    if (durationMs >= this.slowRequestMs) {
      existing.slow += 1;
      this.totalSlowRequests += 1;
    }

    this.routeStats.set(routeKey, existing);

    const event: RequestSnapshot = {
      method,
      path,
      statusCode,
      durationMs,
      requestId: input.requestId || "",
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      this.pushRecent(this.recentErrors, event);
      this.tryAlert("server-error", event);
    }

    if (durationMs >= this.slowRequestMs) {
      this.pushRecent(this.recentSlow, event);
      if (durationMs >= this.alertSlowRequestMs) {
        this.tryAlert("slow-request", event);
      }
    }
  }

  recordFrontendError(input: FrontendErrorReportInput): FrontendErrorSnapshot | null {
    const message = sanitizeText(input.message, 400);
    if (!message) {
      return null;
    }

    const event: FrontendErrorSnapshot = {
      message,
      boundaryName:
        sanitizeText(input.boundaryName || input.errorBoundary, 120) || "unknown-boundary",
      href: sanitizeText(input.href, 400),
      digest: sanitizeText(input.digest, 120) || undefined,
      userAgent: sanitizeText(input.userAgent, 220) || undefined,
      stackPreview: sanitizeText(input.stack, 800) || undefined,
      componentStackPreview: sanitizeText(input.componentStack, 800) || undefined,
      timestamp: sanitizeText(input.timestamp, 80) || new Date().toISOString(),
    };

    this.totalFrontendErrors += 1;
    this.pushRecent(this.recentFrontendErrors, event);

    logger.warn("[observability] frontend error captured", {
      boundaryName: event.boundaryName,
      href: event.href,
      digest: event.digest,
      message: event.message,
    });

    return event;
  }

  getSnapshot() {
    const sortedLatencies = [...this.latencySamples].sort((a, b) => a - b);
    const total = this.totalRequests || 1;

    const topRoutes = [...this.routeStats.entries()]
      .map(([route, stats]) => ({
        route,
        count: stats.count,
        errors: stats.errors,
        slow: stats.slow,
        avgDurationMs: Number((stats.totalDurationMs / Math.max(1, stats.count)).toFixed(2)),
        maxDurationMs: stats.maxDurationMs,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      service: "gush-backend",
      startedAt: new Date(this.startedAt).toISOString(),
      uptimeSec: Math.round((Date.now() - this.startedAt) / 1000),
      sentryEnabled: this.sentryEnabled,
      alertWebhookEnabled: Boolean(this.alertWebhook),
      thresholds: {
        slowRequestMs: this.slowRequestMs,
        alertSlowRequestMs: this.alertSlowRequestMs,
      },
      requests: {
        total: this.totalRequests,
        errorRatePct: Number(((this.totalErrors / total) * 100).toFixed(2)),
        slowRatePct: Number(((this.totalSlowRequests / total) * 100).toFixed(2)),
        statusBuckets: this.statusBuckets,
      },
      frontendErrors: {
        total: this.totalFrontendErrors,
        recent: [...this.recentFrontendErrors],
      },
      latencyMs: {
        p50: percentile(sortedLatencies, 50),
        p95: percentile(sortedLatencies, 95),
        p99: percentile(sortedLatencies, 99),
      },
      topRoutes,
      recentErrors: [...this.recentErrors],
      recentSlow: [...this.recentSlow],
      time: new Date().toISOString(),
    };
  }

  private pushRecent<T>(target: T[], event: T): void {
    target.push(event);
    if (target.length > MAX_RECENT_EVENTS) {
      target.shift();
    }
  }

  private tryAlert(type: "server-error" | "slow-request", event: RequestSnapshot): void {
    if (!this.alertWebhook) {
      return;
    }

    const key = `${type}:${event.method}:${event.path}`;
    const now = Date.now();
    const last = this.lastAlertAt.get(key) || 0;
    if (now - last < this.alertCooldownMs) {
      return;
    }
    this.lastAlertAt.set(key, now);

    const payload = {
      service: "gush-backend",
      type,
      environment: getAppConfig().environment,
      event,
      sentAt: new Date().toISOString(),
    };

    void fetch(this.alertWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((error) => {
      logger.warn("[observability] alert webhook failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

