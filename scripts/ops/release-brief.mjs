import { existsSync, readFileSync, writeFileSync } from "node:fs";

const DEFAULT_SUMMARY_JSON_PATH = "ops-release-summary.json";
const DEFAULT_BRIEF_MD_PATH = "ops-release-brief.md";

function readSummary(path) {
  if (!existsSync(path)) {
    throw new Error(`release summary not found: ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(
      `failed to parse release summary: ${path} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

function normalizeList(value) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function buildBrief(summary) {
  const verdict = String(summary?.verdict || "UNKNOWN");
  const release = summary?.release || {};
  const watchdog = summary?.watchdog || {};
  const blockers = normalizeList(summary?.blockers);
  const advisories = normalizeList(summary?.advisories);
  const topAdvisories = advisories.slice(0, 3);

  const lines = [
    "# Release Brief",
    "",
    `## Executive Verdict`,
    `- Release status: **${verdict}**`,
    `- Backend: ${release.backendUrl || "n/a"}`,
    `- Frontend: ${release.frontendUrl || "n/a"}`,
    `- Release gate: ${release.verdict || "unknown"} (baseline=${release.baseline || "unknown"}, full=${release.full || "unknown"})`,
    `- Watchdog: severity=${watchdog.severity || "unknown"}, status=${watchdog.status || "unknown"}`,
    "",
    "## Blockers",
  ];

  if (blockers.length === 0) {
    lines.push("- none");
  } else {
    for (const item of blockers) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("", "## Top Advisories");
  if (topAdvisories.length === 0) {
    lines.push("- none");
  } else {
    for (const item of topAdvisories) {
      lines.push(`- ${item}`);
    }
  }

  lines.push("", "## Recommended Action");
  if (verdict === "READY") {
    lines.push("- Proceed with release.");
    if (advisories.length > 0) {
      lines.push("- Track advisories post-release and close them in the next ops window.");
    }
  } else {
    lines.push("- Do not release.");
    lines.push("- Resolve blockers and rerun `npm run ops:release:all-live`.");
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const summaryPath =
    String(process.env.OPS_RELEASE_SUMMARY_JSON || DEFAULT_SUMMARY_JSON_PATH).trim()
    || DEFAULT_SUMMARY_JSON_PATH;
  const briefPath =
    String(process.env.OPS_RELEASE_BRIEF_MD || DEFAULT_BRIEF_MD_PATH).trim()
    || DEFAULT_BRIEF_MD_PATH;

  const summary = readSummary(summaryPath);
  const brief = buildBrief(summary);
  writeFileSync(briefPath, brief, "utf8");

  console.log(`[release-brief] summary=${summaryPath}`);
  console.log(`[release-brief] brief=${briefPath}`);
  console.log(`[release-brief] verdict=${String(summary?.verdict || "UNKNOWN")}`);
}

try {
  main();
} catch (error) {
  console.error(`[release-brief] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
