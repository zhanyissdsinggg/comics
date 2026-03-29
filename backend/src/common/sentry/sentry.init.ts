import * as Sentry from "@sentry/node";
import { getAppConfig } from "../config/app-config";
import { logger } from "../logger/winston.init";

export function initSentry() {
  const appConfig = getAppConfig();
  const dsn = appConfig.observability.sentryDsn;

  if (!dsn) {
    logger.warn("SENTRY_DSN is not configured; Sentry is disabled.");
    return;
  }

  Sentry.init({
    dsn,
    environment: appConfig.environment,
    tracesSampleRate: appConfig.environment === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.exception) {
        const error = event.exception.values?.[0]?.value || "";
        if (error.includes("404") || error.includes("ECONNREFUSED")) {
          return null;
        }
      }
      return event;
    },
  });

  logger.info("Sentry initialized.");
}
