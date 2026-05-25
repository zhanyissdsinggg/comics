import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const envLoader = process as NodeJS.Process & {
  loadEnvFile?: (path?: string) => void;
};

function loadOpenApiEnvFile(pathname: string) {
  if (typeof envLoader.loadEnvFile !== "function") {
    return;
  }

  try {
    envLoader.loadEnvFile(pathname);
  } catch {
    // Ignore missing local env files. OpenAPI generation supports partial local setup.
  }
}

function primeOpenApiEnvironment() {
  const cwd = process.cwd();
  loadOpenApiEnvFile(resolve(cwd, ".env"));
  loadOpenApiEnvFile(resolve(cwd, ".env.local"));

  if (!String(process.env.NODE_ENV || "").trim()) {
    process.env.NODE_ENV = "test";
  }

  process.env.ENABLE_ADMIN_RUNTIME = "1";
  process.env.ENABLE_COMMERCIAL_RUNTIME = "1";
  process.env.ENABLE_OPS_RUNTIME = "1";
}

function sortJsonDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortJsonDeep);
  }

  if (value && typeof value === "object" && value.constructor === Object) {
    const sortedKeys = Object.keys(value).sort((a, b) => a.localeCompare(b));
    const next: Record<string, any> = {};
    for (const key of sortedKeys) {
      next[key] = sortJsonDeep(value[key]);
    }
    return next;
  }

  return value;
}

export function toStableJson(value: any): string {
  const normalized = sortJsonDeep(value);
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

function buildSwaggerDocumentConfig() {
  return new DocumentBuilder()
    .setTitle("Gush Reading Platform Backend")
    .setDescription(
      "Production backend for the Gush comics-and-novels reading platform.",
    )
    .setVersion("1.0.0")
    .build();
}

export async function generateOpenApiContract(outputPath: string) {
  const targetPath = resolve(outputPath);
  primeOpenApiEnvironment();
  const { AppModule } = await import("../src/app.module");
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  try {
    app.setGlobalPrefix("api");
    const config = buildSwaggerDocumentConfig();
    const document = SwaggerModule.createDocument(app, config);
    const content = toStableJson(document);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content, "utf8");
  } finally {
    await app.close();
  }
}

export function readStableJsonFile(pathname: string): string {
  const raw = readFileSync(pathname, "utf8");
  return toStableJson(JSON.parse(raw));
}
