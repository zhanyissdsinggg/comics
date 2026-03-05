import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const targets = [
  path.join(repoRoot, "frontend"),
  path.join(repoRoot, "backend", "src"),
  path.join(repoRoot, "backend", "test"),
  path.join(repoRoot, "next.config.js"),
];

const suspiciousPattern = /[闂閺婵妫缂鐎閻娴鎴鍙锛鈥銆锟鑰]/;
const codeExtPattern = /\.(js|jsx|ts|tsx|cjs|mjs)$/;
const ignoredDirs = new Set(["node_modules", ".next", "dist", "coverage"]);

function walk(target, list = []) {
  if (!fs.existsSync(target)) {
    return list;
  }

  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (codeExtPattern.test(target)) {
      list.push(target);
    }
    return list;
  }

  const entries = fs.readdirSync(target, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      walk(full, list);
      continue;
    }

    if (codeExtPattern.test(entry.name)) {
      list.push(full);
    }
  }

  return list;
}

function extractCommentPart(line) {
  const slash = line.indexOf("//");
  if (slash >= 0) {
    return line.slice(slash + 2);
  }

  const trimmed = line.trimStart();
  if (trimmed.startsWith("/*") || trimmed.startsWith("*")) {
    return trimmed;
  }

  return null;
}

const violations = [];
const files = targets.flatMap((target) => walk(target));

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const comment = extractCommentPart(line);
    if (comment && suspiciousPattern.test(comment)) {
      violations.push(`${path.relative(repoRoot, file)}:${index + 1}`);
    }
  });
}

if (violations.length > 0) {
  console.error("[hygiene] corrupted comment text detected:");
  violations.slice(0, 100).forEach((v) => console.error(`- ${v}`));
  if (violations.length > 100) {
    console.error(`...and ${violations.length - 100} more`);
  }
  process.exit(1);
}

console.log("[hygiene] comment encoding check passed");