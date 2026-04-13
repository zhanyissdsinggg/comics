import { z } from "zod";
import { resolve } from "path";

const envLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

if (typeof envLoader.loadEnvFile === "function") {
  try {
    envLoader.loadEnvFile(resolve(process.cwd(), ".env"));
  } catch {
    // Ignore missing local env files. Production should inject process env directly.
  }
}

const DEFAULT_PORT = 4000;
const DEFAULT_FRONTEND_ORIGIN = "http://localhost:3000";
const DEFAULT_TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/gush_test";
const DEFAULT_TEST_JWT_SECRET = "test-jwt-secret-keep-it-long-enough-for-validation";
const DEFAULT_TEST_ADMIN_KEY = "TestAdminKey123!Secure";
const DEFAULT_LOG_LEVEL = "info";

function isJestCliProcess(): boolean {
  return (
    typeof (globalThis as { jest?: unknown }).jest !== "undefined" ||
    String(process.env.npm_lifecycle_event || "").trim() === "test" ||
    process.argv.some((arg) => String(arg || "").toLowerCase().includes("jest"))
  );
}

export function isTestLikeRuntime(rawEnv: NodeJS.ProcessEnv = process.env): boolean {
  const nodeEnv = String(rawEnv.NODE_ENV || process.env.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv === "test") {
    return true;
  }

  const jestWorkerId = String(rawEnv.JEST_WORKER_ID || process.env.JEST_WORKER_ID || "").trim();
  if (jestWorkerId) {
    return true;
  }

  return isJestCliProcess();
}

function normalizeCsv(value: string | undefined): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOptional(value: string | undefined): string {
  return String(value || "").trim();
}

function normalizeBoolean(value: string | undefined, fallback = false): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(normalized);
}

function normalizeInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeIndexedAssignments(value: string | undefined): Record<number, string> {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce<Record<number, string>>((accumulator, entry) => {
      const [rawIndex, rawValue] = entry.split(/[:=]/, 2).map((part) => String(part || "").trim());
      const index = Number.parseInt(rawIndex, 10);
      if (!Number.isFinite(index) || index <= 0 || !rawValue) {
        return accumulator;
      }
      accumulator[index] = rawValue;
      return accumulator;
    }, {});
}

function withTestDefaults(rawEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (!isTestLikeRuntime(rawEnv)) {
    return rawEnv;
  }

  const normalizedEnv = { ...rawEnv };

  if (!String(normalizedEnv.NODE_ENV || "").trim()) {
    normalizedEnv.NODE_ENV = "test";
  }
  if (!String(normalizedEnv.PORT || "").trim()) {
    normalizedEnv.PORT = String(DEFAULT_PORT);
  }
  if (!String(normalizedEnv.FRONTEND_ORIGIN || "").trim()) {
    normalizedEnv.FRONTEND_ORIGIN = DEFAULT_FRONTEND_ORIGIN;
  }
  if (!String(normalizedEnv.DATABASE_URL || "").trim()) {
    normalizedEnv.DATABASE_URL = DEFAULT_TEST_DATABASE_URL;
  }
  if (String(normalizedEnv.JWT_SECRET || "").trim().length < 32) {
    normalizedEnv.JWT_SECRET = DEFAULT_TEST_JWT_SECRET;
  }
  if (
    !String(normalizedEnv.ADMIN_KEY || "").trim() &&
    !String(normalizedEnv.ADMIN_KEYS || "").trim()
  ) {
    normalizedEnv.ADMIN_KEY = DEFAULT_TEST_ADMIN_KEY;
  }

  return normalizedEnv;
}

const appConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_PORT),
    FRONTEND_ORIGIN: z.string().min(1, "FRONTEND_ORIGIN is required"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    ADMIN_KEY: z.string().optional().default(""),
    ADMIN_KEYS: z.string().optional().default(""),
    ADMIN_TOTP_SECRET: z.string().optional().default(""),
    ADMIN_TOTP_DIGITS: z.coerce.number().int().min(6).max(8).default(6),
    ADMIN_TOTP_PERIOD_SECONDS: z.coerce.number().int().min(15).max(300).default(30),
    ADMIN_TOTP_WINDOW: z.coerce.number().int().min(0).max(5).default(1),
    ADMIN_ROLE_ASSIGNMENTS: z.string().optional().default(""),
    COOKIE_DOMAIN: z.string().optional().default(""),
    COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).optional(),
    COOKIE_SECURE: z.string().optional().default(""),
    REDIS_URL: z.string().optional().default(""),
    GOOGLE_CLIENT_ID: z.string().optional().default(""),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional().default(""),
    SENTRY_DSN: z.string().optional().default(""),
    ALERT_WEBHOOK_URL: z.string().optional().default(""),
    OBS_SLOW_REQUEST_MS: z.coerce.number().int().min(100).default(2000),
    OBS_ALERT_SLOW_REQUEST_MS: z.coerce.number().int().min(100).default(4000),
    OBS_ALERT_COOLDOWN_MS: z.coerce.number().int().min(1000).default(60000),
    OBSERVABILITY_KEY: z.string().optional().default(""),
    OBSERVABILITY_PUBLIC: z.string().optional().default("0"),
    EMAIL_PROVIDER: z.string().optional().default("console"),
    EMAIL_FROM: z.string().optional().default(""),
    ADMIN_NOTIFY_EMAIL: z.string().optional().default(""),
    SMS_WEBHOOK_URL: z.string().optional().default(""),
    EMAIL_SECRET: z.string().optional().default(""),
    BILLING_MODE: z.enum(["demo", "provider"]).optional(),
    PUBLIC_ASSET_BASE_URL: z.string().optional().default(""),
    BACKEND_PUBLIC_URL: z.string().optional().default(""),
    LOG_LEVEL: z.string().optional().default(DEFAULT_LOG_LEVEL),
    AUTH_DEBUG_TOKENS: z.string().optional().default("0"),
    WEBHOOK_SECRET: z.string().optional().default(""),
    ADMIN_COOKIE_SECURE: z.string().optional().default(""),
    ADMIN_TOKEN_FALLBACK_ENABLED: z.string().optional().default("0"),
    ADMIN_LEGACY_BEARER_ENABLED: z.string().optional().default("0"),
    ADMIN_CONTENT_GENERATOR_ENABLED: z.string().optional().default(""),
    ADMIN_PASSWORD_AUTH_ENABLED: z.string().optional().default("1"),
    ENABLE_ADMIN_RUNTIME: z.string().optional().default("1"),
    ENABLE_COMMERCIAL_RUNTIME: z.string().optional().default("1"),
    ENABLE_OPS_RUNTIME: z.string().optional().default("1"),
  })
  .transform((env) => {
    const frontendOrigins = normalizeCsv(env.FRONTEND_ORIGIN);
    const adminKeys = [...normalizeCsv(env.ADMIN_KEYS), normalizeOptional(env.ADMIN_KEY)].filter(Boolean);
    const googleClientId = normalizeOptional(env.GOOGLE_CLIENT_ID || env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

    return {
      environment: env.NODE_ENV,
      database: {
        url: env.DATABASE_URL,
      },
      server: {
        port: env.PORT,
        frontendOrigins,
        logLevel: normalizeOptional(env.LOG_LEVEL) || DEFAULT_LOG_LEVEL,
      },
      auth: {
        jwtSecret: env.JWT_SECRET,
        debugTokensEnabled: normalizeBoolean(env.AUTH_DEBUG_TOKENS, false) && env.NODE_ENV !== "production",
        googleClientId,
      },
      admin: {
        keys: [...new Set(adminKeys)],
        totpSecret: normalizeOptional(env.ADMIN_TOTP_SECRET),
        totpDigits: env.ADMIN_TOTP_DIGITS,
        totpPeriodSeconds: env.ADMIN_TOTP_PERIOD_SECONDS,
        totpWindow: env.ADMIN_TOTP_WINDOW,
        roleAssignments: normalizeIndexedAssignments(env.ADMIN_ROLE_ASSIGNMENTS),
        cookieSecure: normalizeOptional(env.ADMIN_COOKIE_SECURE),
        tokenFallbackEnabled: normalizeBoolean(env.ADMIN_TOKEN_FALLBACK_ENABLED, false),
        legacyBearerEnabled: normalizeBoolean(env.ADMIN_LEGACY_BEARER_ENABLED, false),
        contentGeneratorEnabled: normalizeOptional(env.ADMIN_CONTENT_GENERATOR_ENABLED),
        passwordAuthEnabled: normalizeBoolean(env.ADMIN_PASSWORD_AUTH_ENABLED, true),
      },
      cookies: {
        domain: normalizeOptional(env.COOKIE_DOMAIN),
        sameSite: env.COOKIE_SAMESITE,
        secure: normalizeOptional(env.COOKIE_SECURE),
      },
      redis: {
        url: normalizeOptional(env.REDIS_URL),
      },
      observability: {
        sentryDsn: normalizeOptional(env.SENTRY_DSN),
        alertWebhookUrl: normalizeOptional(env.ALERT_WEBHOOK_URL),
        publicEnabled: normalizeBoolean(env.OBSERVABILITY_PUBLIC, false),
        accessKey: normalizeOptional(env.OBSERVABILITY_KEY),
        slowRequestMs: env.OBS_SLOW_REQUEST_MS,
        alertSlowRequestMs: env.OBS_ALERT_SLOW_REQUEST_MS,
        alertCooldownMs: env.OBS_ALERT_COOLDOWN_MS,
      },
      email: {
        provider: normalizeOptional(env.EMAIL_PROVIDER) || "console",
        from: normalizeOptional(env.EMAIL_FROM),
        adminNotifyEmail: normalizeOptional(env.ADMIN_NOTIFY_EMAIL),
        smsWebhookUrl: normalizeOptional(env.SMS_WEBHOOK_URL),
        secret: normalizeOptional(env.EMAIL_SECRET),
      },
      billing: {
        mode: env.BILLING_MODE,
      },
      payments: {
        webhookSecret: normalizeOptional(env.WEBHOOK_SECRET),
      },
      assets: {
        publicBaseUrl: normalizeOptional(env.PUBLIC_ASSET_BASE_URL),
        backendPublicUrl: normalizeOptional(env.BACKEND_PUBLIC_URL),
      },
      runtime: {
        adminEnabled: normalizeBoolean(env.ENABLE_ADMIN_RUNTIME, true),
        commercialEnabled: normalizeBoolean(env.ENABLE_COMMERCIAL_RUNTIME, true),
        opsEnabled: normalizeBoolean(env.ENABLE_OPS_RUNTIME, true),
      },
    };
  })
  .superRefine((config, ctx) => {
    if (config.server.frontendOrigins.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "FRONTEND_ORIGIN must include at least one origin",
        path: ["server", "frontendOrigins"],
      });
    }

    if (
      config.environment !== "test"
      && config.admin.keys.length === 0
      && !config.admin.passwordAuthEnabled
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Set ADMIN_KEY/ADMIN_KEYS or enable ADMIN_PASSWORD_AUTH_ENABLED before starting the backend",
        path: ["admin", "keys"],
      });
    }
  });

export type AppConfig = z.infer<typeof appConfigSchema>;

let cachedConfig: AppConfig | null = null;

export function loadAndValidateAppConfig(rawEnv: NodeJS.ProcessEnv = process.env): AppConfig {
  const normalizedEnv = withTestDefaults(rawEnv);
  return appConfigSchema.parse(normalizedEnv);
}

export function getAppConfig(): AppConfig {
  if (isTestLikeRuntime(process.env)) {
    return loadAndValidateAppConfig(process.env);
  }
  if (!cachedConfig) {
    cachedConfig = loadAndValidateAppConfig(process.env);
  }
  return cachedConfig;
}

export function resetAppConfigForTests(): void {
  cachedConfig = null;
}

export function getPrimaryFrontendOrigin(): string {
  return getAppConfig().server.frontendOrigins[0] || DEFAULT_FRONTEND_ORIGIN;
}

export function getBillingModeConfig(): "demo" | "provider" {
  const config = getAppConfig();
  if (config.billing.mode) {
    return config.billing.mode;
  }
  return config.environment === "production" ? "provider" : "demo";
}

export function getCookieSecureDefault(sameSite?: "lax" | "strict" | "none"): boolean {
  const config = getAppConfig();
  if (config.cookies.secure) {
    return normalizeBoolean(config.cookies.secure, false);
  }
  return config.environment === "production" || sameSite === "none";
}

export function getRedisConfiguredUrl(): string {
  return getAppConfig().redis.url;
}

export function getPublicAssetBaseUrlConfig(): string {
  const config = getAppConfig();
  return config.assets.publicBaseUrl || config.assets.backendPublicUrl;
}

export function getAdminTotpConfig() {
  const config = getAppConfig();
  return {
    secret: config.admin.totpSecret,
    digits: config.admin.totpDigits,
    periodSeconds: config.admin.totpPeriodSeconds,
    window: config.admin.totpWindow,
  };
}

export function getObservabilityRuntimeConfig() {
  return getAppConfig().observability;
}

export function getWebhookSecretConfig(): string {
  return getAppConfig().payments.webhookSecret;
}

export function getAdminCookieSecureOverride(): string {
  return getAppConfig().admin.cookieSecure;
}

export function isAdminTokenFallbackEnabledConfig(): boolean {
  return getAppConfig().admin.tokenFallbackEnabled;
}

export function isAdminLegacyBearerEnabledConfig(): boolean {
  return getAppConfig().admin.legacyBearerEnabled;
}

export function isAdminContentGeneratorEnabledConfig(): boolean {
  const config = getAppConfig();
  const override = config.admin.contentGeneratorEnabled;
  if (override) {
    return normalizeBoolean(override, false);
  }
  return config.environment !== "production";
}
