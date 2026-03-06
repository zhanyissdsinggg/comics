import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { AppModule } from "../src/app.module";

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
    .setTitle("Gush Backend")
    .setDescription("Mock backend API for Gush.")
    .setVersion("0.1.0")
    .build();
}

export async function generateOpenApiContract(outputPath: string) {
  const targetPath = resolve(outputPath);
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
