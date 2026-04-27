import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

function hasFlag(name) {
  return process.argv.includes(name);
}

function normalize(relPath) {
  return relPath.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function resolveSafe(relPath) {
  const next = path.resolve(ROOT, relPath);
  if (!next.startsWith(ROOT)) {
    throw new Error(`Refusing to touch path outside repo root: ${next}`);
  }
  return next;
}

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function removePath(absPath, dryRun) {
  if (dryRun) {
    console.log(`[cleanup] would remove ${path.relative(ROOT, absPath).replace(/\\/g, "/")}`);
    return;
  }

  await fs.rm(absPath, { recursive: true, force: true });
  console.log(`[cleanup] removed ${path.relative(ROOT, absPath).replace(/\\/g, "/")}`);
}

async function main() {
  const dryRun = !hasFlag("--force");
  const targets = [
    ".ace-tool",
    ".playwright-mcp",
    ".spec-workflow",
    ".tmp-redesign-source",
    "test-results",
    "ops-release-history",
    "ops-watchdog-report.json",
    "ops-watchdog-report.md",
    "ops-release-ready-report.json",
    "ops-release-ready-report.md",
    "ops-release-summary.json",
    "ops-release-summary.md",
    "ops-release-brief.md",
    "ops-release-dashboard.md",
    "frontend/.next",
    "frontend/.next-playwright",
    "frontend/.tmp-admin-audit",
    "frontend/test-results",
    "frontend/playwright-report",
    "frontend/build-admin-ui-pass.log",
    "backend/dist",
    "backend/public",
    "frontend/app/events",
    "frontend/app/api/admin/users",
    "frontend-dev.log",
  ];

  // Wildcard-ish log cleanup without touching env files.
  const logGlobs = [
    "frontend-dev-",
    "frontend/.next-",
    "frontend/.tmp-",
    "backend/.backend-qa",
  ];

  console.log(`[cleanup] mode=${dryRun ? "dry-run" : "force"}`);

  for (const rel of targets) {
    const abs = resolveSafe(rel);
    if (await exists(abs)) {
      await removePath(abs, dryRun);
    }
  }

  const walkRoots = [ROOT, path.resolve(ROOT, "frontend"), path.resolve(ROOT, "backend")];
  for (const base of walkRoots) {
    let entries = [];
    try {
      entries = await fs.readdir(base, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      const name = entry.name;
      const rel = normalize(path.relative(ROOT, path.join(base, name)));

      if (name === ".env" || name.startsWith(".env.")) {
        continue;
      }

      if (name.endsWith(".log") || logGlobs.some((prefix) => rel.startsWith(prefix))) {
        await removePath(resolveSafe(rel), dryRun);
      }
    }
  }
}

main().catch((error) => {
  console.error(`[cleanup] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

