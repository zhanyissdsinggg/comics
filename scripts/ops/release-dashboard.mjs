import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_HISTORY_DIR = "ops-release-history";
const DEFAULT_DASHBOARD_PATH = "ops-release-dashboard.md";
const DEFAULT_CURRENT_SUMMARY = "ops-release-summary.json";
const DEFAULT_KEEP = 10;

function readJsonIfExists(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function toNumber(input, fallback) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

function getHistoryEntries(historyDir) {
  if (!existsSync(historyDir)) {
    return [];
  }

  const dirs = readdirSync(historyDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));

  const result = [];
  for (const dir of dirs) {
    const basePath = join(historyDir, dir);
    const summary = readJsonIfExists(join(basePath, "ops-release-summary.json"));
    const ready = readJsonIfExists(join(basePath, "ops-release-ready-report.json"));
    const watchdog = readJsonIfExists(join(basePath, "ops-watchdog-report.json"));
    result.push({
      runId: dir,
      summary,
      ready,
      watchdog,
    });
  }
  return result;
}

function buildTopBlockers(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const blockers = Array.isArray(entry.summary?.blockers) ? entry.summary.blockers : [];
    for (const blocker of blockers) {
      const key = String(blocker);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function buildSeverityTrend(entries) {
  const trend = { P0: 0, P1: 0, P2: 0, P3: 0, UNKNOWN: 0 };
  for (const entry of entries) {
    const severity = String(entry.summary?.watchdog?.severity || entry.watchdog?.severity || "UNKNOWN").toUpperCase();
    if (Object.prototype.hasOwnProperty.call(trend, severity)) {
      trend[severity] += 1;
    } else {
      trend.UNKNOWN += 1;
    }
  }
  return trend;
}

function buildMarkdown({ currentSummary, entries, keep, historyDir }) {
  const recent = entries.slice(0, keep);
  const topBlockers = buildTopBlockers(recent);
  const severityTrend = buildSeverityTrend(recent);

  const lines = [
    "# OPS Release Dashboard",
    "",
    `- generatedAt: ${new Date().toISOString()}`,
    `- historyDir: ${historyDir}`,
    `- windowSize: ${recent.length}`,
    `- currentVerdict: ${String(currentSummary?.verdict || "UNKNOWN")}`,
    `- currentMode: ${String(currentSummary?.release?.mode || "unknown")}`,
    `- currentFullGatePolicy: ${String(currentSummary?.release?.fullGatePolicy || "unknown")}`,
    `- currentThresholdTier: ${String(currentSummary?.release?.thresholdTier || "unknown")}`,
    "",
    "## Recent Runs",
    "",
    "| runId | verdict | mode | threshold | baseline | full | watchdog | blockers | advisories |",
    "| --- | --- | --- | --- | --- | --- | --- | ---: | ---: |",
  ];

  for (const entry of recent) {
    const summary = entry.summary || {};
    const release = summary.release || {};
    const watchdog = summary.watchdog || {};
    const blockers = Array.isArray(summary.blockers) ? summary.blockers.length : 0;
    const advisories = Array.isArray(summary.advisories) ? summary.advisories.length : 0;
    lines.push(
      `| ${entry.runId} | ${summary.verdict || "UNKNOWN"} | ${release.mode || "unknown"} | ${release.thresholdTier || "unknown"} | ${release.baseline || "unknown"} | ${release.full || "unknown"} | ${watchdog.severity || "unknown"}/${watchdog.status || "unknown"} | ${blockers} | ${advisories} |`,
    );
  }

  lines.push("", "## Watchdog Severity Trend (Recent Window)");
  lines.push(`- P0: ${severityTrend.P0}`);
  lines.push(`- P1: ${severityTrend.P1}`);
  lines.push(`- P2: ${severityTrend.P2}`);
  lines.push(`- P3: ${severityTrend.P3}`);
  lines.push(`- UNKNOWN: ${severityTrend.UNKNOWN}`);

  lines.push("", "## Top Blockers (Recent Window)");
  if (topBlockers.length === 0) {
    lines.push("- none");
  } else {
    for (const [name, count] of topBlockers) {
      lines.push(`- ${name} (${count})`);
    }
  }

  lines.push("", "## Notes");
  lines.push("- fast mode: baseline strict live gate is blocking, full strict gate is optional.");
  lines.push("- strict mode: baseline + full strict gates are both required.");

  return `${lines.join("\n")}\n`;
}

function main() {
  const historyDir = String(process.env.OPS_RELEASE_HISTORY_DIR || DEFAULT_HISTORY_DIR).trim() || DEFAULT_HISTORY_DIR;
  const dashboardPath = String(process.env.OPS_RELEASE_DASHBOARD_MD || DEFAULT_DASHBOARD_PATH).trim()
    || DEFAULT_DASHBOARD_PATH;
  const currentSummaryPath = String(process.env.OPS_RELEASE_SUMMARY_JSON || DEFAULT_CURRENT_SUMMARY).trim()
    || DEFAULT_CURRENT_SUMMARY;
  const keep = toNumber(process.env.OPS_RELEASE_DASHBOARD_KEEP || DEFAULT_KEEP, DEFAULT_KEEP);

  const entries = getHistoryEntries(historyDir);
  const currentSummary = readJsonIfExists(currentSummaryPath) || {};
  const markdown = buildMarkdown({ currentSummary, entries, keep, historyDir });

  writeFileSync(dashboardPath, markdown, "utf8");
  console.log(`[release-dashboard] historyDir=${historyDir}`);
  console.log(`[release-dashboard] keep=${keep}`);
  console.log(`[release-dashboard] output=${dashboardPath}`);
}

try {
  main();
} catch (error) {
  console.error(`[release-dashboard] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
