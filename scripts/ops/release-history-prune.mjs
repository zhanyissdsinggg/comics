import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_HISTORY_DIR = "ops-release-history";
const DEFAULT_KEEP = 30;

function readKeepCount() {
  const parsed = Number(process.env.OPS_RELEASE_HISTORY_KEEP || String(DEFAULT_KEEP));
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_KEEP;
  }
  return Math.floor(parsed);
}

function listHistoryDirs(baseDir) {
  if (!existsSync(baseDir)) {
    return [];
  }
  return readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const fullPath = join(baseDir, entry.name);
      let mtimeMs = 0;
      try {
        mtimeMs = statSync(fullPath).mtimeMs;
      } catch {
        mtimeMs = 0;
      }
      return {
        name: entry.name,
        fullPath,
        mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function main() {
  const historyDir = String(process.env.OPS_RELEASE_HISTORY_DIR || DEFAULT_HISTORY_DIR).trim() || DEFAULT_HISTORY_DIR;
  const keep = readKeepCount();
  const dirs = listHistoryDirs(historyDir);

  if (dirs.length <= keep) {
    console.log(`[release-history-prune] keep=${keep} total=${dirs.length} removed=0`);
    return;
  }

  const toRemove = dirs.slice(keep);
  for (const entry of toRemove) {
    rmSync(entry.fullPath, { recursive: true, force: true });
  }

  console.log(`[release-history-prune] keep=${keep} total=${dirs.length} removed=${toRemove.length}`);
}

try {
  main();
} catch (error) {
  console.error(
    `[release-history-prune] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
