import { existsSync, readFileSync, writeFileSync } from "node:fs";

const DEFAULT_RELEASE_REPORT_PATH = "ops-release-ready-report.json";
const DEFAULT_WATCHDOG_REPORT_PATH = "ops-watchdog-report.json";
const DEFAULT_SUMMARY_MD_PATH = "ops-release-summary.md";
const DEFAULT_SUMMARY_JSON_PATH = "ops-release-summary.json";

function readJsonIfExists(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`failed to parse json: ${path} (${error instanceof Error ? error.message : String(error)})`);
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildSummary(releaseReport, watchdogReport) {
  const releaseVerdict = String(releaseReport?.verdict || "unknown");
  const releaseBaseline = String(releaseReport?.baseline?.status || "unknown");
  const releaseFull = String(releaseReport?.full?.status || "unknown");
  const releaseMode = String(releaseReport?.mode || (releaseReport?.requireFull ? "strict" : "fast"));
  const fullGatePolicy = String(releaseReport?.fullGatePolicy || (releaseReport?.requireFull ? "required" : "optional"));
  const thresholdTier = String(releaseReport?.thresholdTier || (releaseReport?.requireFull ? "strict-p2" : "baseline-default"));
  const watchdogSeverity = String(watchdogReport?.severity || "unknown");
  const watchdogStatus = String(watchdogReport?.status || "unknown");
  const watchdogWarnings = normalizeArray(watchdogReport?.warnings);
  const watchdogBreaches = normalizeArray(watchdogReport?.breaches);

  const blockers = [];
  const advisories = [];

  if (releaseVerdict !== "pass") {
    blockers.push(`release gate verdict=${releaseVerdict}`);
  }
  if (watchdogStatus === "breach" || watchdogSeverity === "P1" || watchdogSeverity === "P2") {
    blockers.push(`watchdog severity=${watchdogSeverity} status=${watchdogStatus}`);
  }

  if (releaseFull === "skipped") {
    advisories.push("full strict gate skipped (missing OBSERVABILITY_KEY or admin credentials)");
  }

  for (const warning of watchdogWarnings) {
    advisories.push(String(warning));
  }

  const releaseReady = blockers.length === 0;
  return {
    generatedAt: new Date().toISOString(),
    releaseReady,
    verdict: releaseReady ? "READY" : "NOT_READY",
    release: {
      verdict: releaseVerdict,
      baseline: releaseBaseline,
      full: releaseFull,
      mode: releaseMode,
      fullGatePolicy,
      thresholdTier,
      backendUrl: releaseReport?.backendUrl || null,
      frontendUrl: releaseReport?.frontendUrl || null,
      timestamp: releaseReport?.timestamp || null,
    },
    watchdog: {
      severity: watchdogSeverity,
      status: watchdogStatus,
      breaches: watchdogBreaches,
      warnings: watchdogWarnings,
      timestamp: watchdogReport?.time || null,
    },
    blockers,
    advisories,
  };
}

function toMarkdown(summary) {
  const lines = [
    "# Release Summary",
    "",
    `- generatedAt: ${summary.generatedAt}`,
    `- verdict: ${summary.verdict}`,
    `- releaseGate: ${summary.release.verdict}`,
    `- mode: ${summary.release.mode}`,
    `- fullGatePolicy: ${summary.release.fullGatePolicy}`,
    `- thresholdTier: ${summary.release.thresholdTier}`,
    `- baseline: ${summary.release.baseline}`,
    `- full: ${summary.release.full}`,
    `- watchdog: severity=${summary.watchdog.severity}, status=${summary.watchdog.status}`,
  ];

  if (summary.release.backendUrl) {
    lines.push(`- backend: ${summary.release.backendUrl}`);
  }
  if (summary.release.frontendUrl) {
    lines.push(`- frontend: ${summary.release.frontendUrl}`);
  }

  lines.push("", "## Blockers");
  if (summary.blockers.length === 0) {
    lines.push("- none");
  } else {
    for (const item of summary.blockers) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("", "## Advisories");
  if (summary.advisories.length === 0) {
    lines.push("- none");
  } else {
    for (const item of summary.advisories) {
      lines.push(`- ${item}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const releaseReportPath =
    String(process.env.OPS_RELEASE_REPORT_JSON || DEFAULT_RELEASE_REPORT_PATH).trim()
    || DEFAULT_RELEASE_REPORT_PATH;
  const watchdogReportPath =
    String(process.env.WATCHDOG_REPORT_JSON || DEFAULT_WATCHDOG_REPORT_PATH).trim()
    || DEFAULT_WATCHDOG_REPORT_PATH;
  const summaryMdPath =
    String(process.env.OPS_RELEASE_SUMMARY_MD || DEFAULT_SUMMARY_MD_PATH).trim()
    || DEFAULT_SUMMARY_MD_PATH;
  const summaryJsonPath =
    String(process.env.OPS_RELEASE_SUMMARY_JSON || DEFAULT_SUMMARY_JSON_PATH).trim()
    || DEFAULT_SUMMARY_JSON_PATH;

  const releaseReport = readJsonIfExists(releaseReportPath);
  const watchdogReport = readJsonIfExists(watchdogReportPath);

  if (!releaseReport) {
    throw new Error(`release report not found: ${releaseReportPath}`);
  }

  if (!watchdogReport) {
    throw new Error(`watchdog report not found: ${watchdogReportPath}`);
  }

  const summary = buildSummary(releaseReport, watchdogReport);
  const markdown = toMarkdown(summary);

  writeFileSync(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(summaryMdPath, markdown, "utf8");

  console.log(`[release-summary] verdict=${summary.verdict}`);
  console.log(`[release-summary] blockers=${summary.blockers.length}`);
  console.log(`[release-summary] advisories=${summary.advisories.length}`);
  console.log(`[release-summary] json=${summaryJsonPath}`);
  console.log(`[release-summary] md=${summaryMdPath}`);
}

try {
  main();
} catch (error) {
  console.error(`[release-summary] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
