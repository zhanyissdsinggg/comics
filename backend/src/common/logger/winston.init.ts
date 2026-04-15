import * as path from "path";
import * as winston from "winston";
import DailyRotateFile = require("winston-daily-rotate-file");
import { isTestLikeRuntime, loadAndValidateAppConfig, type AppConfig } from "../config/app-config";

type LoggerBootstrapConfig = Pick<AppConfig, "environment" | "server">;

function resolveLoggerBootstrapConfig(): LoggerBootstrapConfig {
  try {
    return loadAndValidateAppConfig(process.env);
  } catch (error) {
    if (!isTestLikeRuntime(process.env)) {
      throw error;
    }

    return {
      environment: "test",
      server: {
        port: 0,
        frontendOrigins: [],
        corsTrustedDomainSuffixes: [],
        logLevel: "warn",
      },
    };
  }
}

const bootstrapConfig = resolveLoggerBootstrapConfig();
const logsDir = path.join(process.cwd(), "logs");

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      }),
    ),
  }),
];

if (bootstrapConfig.environment === "production") {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, "application-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: 14,
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json(),
      ),
    }) as any,
    new DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: 14,
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json(),
      ),
    }) as any,
  );
}

export const logger = winston.createLogger({
  level: bootstrapConfig.server.logLevel || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
  ),
  transports,
  exceptionHandlers:
    bootstrapConfig.environment === "production"
      ? [
          new DailyRotateFile({
            filename: path.join(logsDir, "exceptions-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxFiles: 14,
          }) as any,
        ]
      : undefined,
});
