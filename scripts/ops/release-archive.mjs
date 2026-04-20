import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_HISTORY_DIR = "ops-release-history";
const DEFAULT_SUMMARY_JSON = "ops-release-summary.json";

function timestampForPath(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function readSummary(summaryPath) {
  if (!existsSync(summaryPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(summaryPath, "utf8"));
  } catch {
    return null;
  }
}

function main() {
  const historyDir = String(process.env.OPS_RELEASE_HISTORY_DIR || DEFAULT_HISTORY_DIR).trim() || DEFAULT_HISTORY_DIR;
  const summaryJson = String(process.env.OPS_RELEASE_SUMMARY_JSON || DEFAULT_SUMMARY_JSON).trim() || DEFAULT_SUMMARY_JSON;
  const summary = readSummary(summaryJson);
  const runStamp = timestampForPath();
  const verdict = String(summary?.verdict || "UNKNOWN").toLowerCase();
  const targetDir = join(historyDir, `${runStamp}-${verdict}`);

  const files = [
    "ops-release-ready-report.json",
    "ops-release-ready-report.md",
    "ops-release-summary.json",
    "ops-release-summary.md",
    "ops-release-brief.md",
    "ops-watchdog-report.json",
    "ops-watchdog-report.md",
  ];

  mkdirSync(targetDir, { recursive: true });
  let copied = 0;
  for (const file of files) {
    if (!existsSync(file)) {
      continue;
    }
    copyFileSync(file, join(targetDir, file));
    copied += 1;
  }

  const meta = {
    archivedAt: new Date().toISOString(),
    sourceSummary: summaryJson,
    verdict: String(summary?.verdict || "UNKNOWN"),
    copiedFiles: copied,
    files: files.filter((file) => existsSync(file)),
  };
  writeFileSync(join(targetDir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");

  console.log(`[release-archive] dir=${targetDir}`);
  console.log(`[release-archive] copied=${copied}`);
}

try {
  main();
} catch (error) {
  console.error(`[release-archive] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
