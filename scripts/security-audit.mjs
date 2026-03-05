import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const allowlistPath = path.join(root, "security", "audit-allowlist.json");

const targets = [
  { name: "frontend", cwd: path.join(root, "frontend") },
  { name: "backend", cwd: path.join(root, "backend") },
];

const allowlist = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
const today = new Date().toISOString().slice(0, 10);

function isAllowlisted(entry) {
  const adv = entry.advisoryId
    ? allowlist.advisories?.[entry.advisoryId]
    : null;
  if (adv && adv.expiresOn >= today) {
    return true;
  }

  const pkg = allowlist.packages?.[entry.packageName];
  if (pkg && pkg.expiresOn >= today) {
    return true;
  }

  return false;
}

function parseEntries(auditJson) {
  const entries = [];
  const vulnerabilities = auditJson?.vulnerabilities || {};

  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    const severity = vulnerability?.severity || "unknown";
    const via = Array.isArray(vulnerability?.via) ? vulnerability.via : [];

    let advisoryIds = [];
    for (const item of via) {
      if (!item || typeof item === "string") {
        continue;
      }
      const source = `${item.url || ""} ${item.title || ""}`;
      const match = source.match(/GHSA-[\w-]+/g);
      if (match) {
        advisoryIds.push(...match);
      }
    }

    advisoryIds = [...new Set(advisoryIds)];
    if (advisoryIds.length === 0) {
      entries.push({
        packageName,
        severity,
        advisoryId: null,
      });
      continue;
    }

    for (const advisoryId of advisoryIds) {
      entries.push({
        packageName,
        severity,
        advisoryId,
      });
    }
  }

  return entries;
}

function runAudit(target) {
  const result = spawnSync("npm audit --json --omit=dev", {
    cwd: target.cwd,
    encoding: "utf8",
    shell: true,
  });

  const output = result.stdout || result.stderr || "{}";
  try {
    return JSON.parse(output);
  } catch {
    return { vulnerabilities: {}, metadata: { vulnerabilities: {} } };
  }
}

const violations = [];

for (const target of targets) {
  const auditJson = runAudit(target);
  const entries = parseEntries(auditJson);

  const critical = entries.filter((entry) => entry.severity === "critical");
  const high = entries.filter((entry) => entry.severity === "high");

  if (critical.length > 0) {
    critical.forEach((entry) => {
      violations.push(
        `[${target.name}] critical vulnerability ${entry.advisoryId || "NO-ID"} in ${entry.packageName}`
      );
    });
  }

  for (const entry of high) {
    if (!isAllowlisted(entry)) {
      violations.push(
        `[${target.name}] high vulnerability ${entry.advisoryId || "NO-ID"} in ${entry.packageName} is not allowlisted`
      );
    }
  }

  console.log(
    `[security] ${target.name}: ${critical.length} critical, ${high.length} high (allowlist applied)`
  );
}

if (violations.length > 0) {
  console.error("[security] violations detected:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("[security] gate passed");
