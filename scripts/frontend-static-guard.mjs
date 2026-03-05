import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(repoRoot, "frontend");

const ignoredDirs = new Set(["node_modules", ".next", "dist", "coverage", "test-results"]);
const codeExtPattern = /\.(js|jsx|ts|tsx)$/;
const dynamicTailwindPattern = /\b(?:bg|text|border|from|to|ring|stroke|fill)-\$\{/;
const adminSurfacePathPattern = /^frontend\/(?:app|components)\/admin\//;
const blockingDialogPattern = /(?:^|[^.\w$])(?:window\.)?(?:alert|confirm|prompt)\(/;

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) {
    return list;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, list);
      continue;
    }

    if (codeExtPattern.test(entry.name)) {
      list.push(fullPath);
    }
  }

  return list;
}

function hasSafeWindowOpenFeatures(lines, lineIndex) {
  const snippet = lines.slice(lineIndex, lineIndex + 4).join(" ");
  return snippet.includes("noopener") && snippet.includes("noreferrer");
}

const violations = [];
const files = walk(frontendRoot);

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  const relativePath = path.relative(repoRoot, file).replace(/\\/g, "/");
  const isAdminSurfaceFile = adminSurfacePathPattern.test(relativePath);

  lines.forEach((line, index) => {
    if (line.includes("onKeyPress=")) {
      violations.push({
        file,
        line: index + 1,
        rule: "deprecated-onKeyPress",
        detail: "Use onKeyDown/onKeyUp instead of onKeyPress.",
      });
    }

    if (dynamicTailwindPattern.test(line)) {
      violations.push({
        file,
        line: index + 1,
        rule: "dynamic-tailwind-class",
        detail: "Avoid Tailwind class fragments like bg-${...}; use static mappings.",
      });
    }

    if (line.includes("window.open(") && !hasSafeWindowOpenFeatures(lines, index)) {
      violations.push({
        file,
        line: index + 1,
        rule: "unsafe-window-open",
        detail: "window.open must include noopener,noreferrer in feature string.",
      });
    }

    if (isAdminSurfaceFile && blockingDialogPattern.test(line)) {
      violations.push({
        file,
        line: index + 1,
        rule: "blocking-browser-dialog-in-admin",
        detail: "Avoid alert()/confirm()/prompt() in admin surfaces; use non-blocking modal or inline feedback.",
      });
    }
  });
}

if (violations.length > 0) {
  console.error("[frontend-guard] violations found:");
  violations.slice(0, 100).forEach((violation) => {
    const relativePath = path.relative(repoRoot, violation.file);
    console.error(
      `- ${relativePath}:${violation.line} [${violation.rule}] ${violation.detail}`
    );
  });
  if (violations.length > 100) {
    console.error(`...and ${violations.length - 100} more`);
  }
  process.exit(1);
}

console.log("[frontend-guard] static checks passed");
