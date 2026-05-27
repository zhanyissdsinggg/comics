import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const nextDir = path.join(frontendRoot, ".next");
const manifestPath = path.join(nextDir, "app-build-manifest.json");

const ROUTE_BUDGETS_KB = {
  "/page": 136,
  "/search/page": 140,
  "/store/page": 110,
  "/read/[seriesId]/[episodeId]/page": 110,
  "/admin/page": 125,
};

const MAX_SINGLE_CHUNK_KB = 60;
const BUDGET_TOLERANCE_KB = 0.5;

function toKB(bytes) {
  return bytes / 1024;
}

async function getGzipSizeSafe(absPath) {
  try {
    const file = await fs.readFile(absPath);
    return zlib.gzipSync(file, { level: 9 }).length;
  } catch {
    return 0;
  }
}

async function checkRouteBudgets(manifest) {
  const failures = [];

  for (const [route, budgetKB] of Object.entries(ROUTE_BUDGETS_KB)) {
    const files = (manifest.pages[route] || []).filter((f) => f.endsWith(".js"));
    const sizes = await Promise.all(
      files.map((rel) => getGzipSizeSafe(path.join(nextDir, rel)))
    );
    const totalBytes = sizes.reduce((sum, s) => sum + s, 0);
    const totalKB = toKB(totalBytes);

    console.log(
      `[perf] route ${route} -> ${totalKB.toFixed(1)} KB (budget ${budgetKB} KB, tolerance ${BUDGET_TOLERANCE_KB} KB)`
    );

    if (totalKB - budgetKB > BUDGET_TOLERANCE_KB) {
      failures.push(
        `Route ${route} exceeds budget: ${totalKB.toFixed(1)} KB > ${budgetKB} KB (+${BUDGET_TOLERANCE_KB} KB tolerance)`
      );
    }
  }

  return failures;
}

async function checkChunkBudget() {
  const chunksDir = path.join(nextDir, "static", "chunks");
  const files = (await fs.readdir(chunksDir)).filter((f) => f.endsWith(".js"));

  let maxFile = "";
  let maxSize = 0;

  for (const file of files) {
    const size = await getGzipSizeSafe(path.join(chunksDir, file));
    if (size > maxSize) {
      maxSize = size;
      maxFile = file;
    }
  }

  const maxKB = toKB(maxSize);
  console.log(
    `[perf] largest chunk ${maxFile} -> ${maxKB.toFixed(1)} KB (budget ${MAX_SINGLE_CHUNK_KB} KB, tolerance ${BUDGET_TOLERANCE_KB} KB)`
  );

  if (maxKB - MAX_SINGLE_CHUNK_KB > BUDGET_TOLERANCE_KB) {
    return [
      `Largest chunk exceeds budget: ${maxKB.toFixed(1)} KB > ${MAX_SINGLE_CHUNK_KB} KB (+${BUDGET_TOLERANCE_KB} KB tolerance)`,
    ];
  }

  return [];
}

async function main() {
  const manifestRaw = await fs.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);

  const routeFailures = await checkRouteBudgets(manifest);
  const chunkFailures = await checkChunkBudget();

  const failures = [...routeFailures, ...chunkFailures];
  if (failures.length > 0) {
    console.error("[perf] budget check failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("[perf] all budgets passed");
}

main().catch((error) => {
  console.error("[perf] budget check error", error);
  process.exit(1);
});
