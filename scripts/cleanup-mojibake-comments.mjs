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
];

const suspiciousPattern = /[闂閺婵妫缂鐎閻娴鎴鍙锛鈥銆锟鑰]/;
const codeExtPattern = /\.(js|jsx|ts|tsx|cjs|mjs)$/;

function walk(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", "coverage"].includes(entry.name)) {
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

function cleanLine(line) {
  const doubleSlash = line.indexOf("//");
  if (doubleSlash >= 0) {
    const before = line.slice(0, doubleSlash);
    const comment = line.slice(doubleSlash + 2);
    if (suspiciousPattern.test(comment)) {
      if (before.trim().length === 0) {
        const indent = before;
        return `${indent}// NOTE: cleaned corrupted comment.`;
      }
      return `${before}// NOTE: cleaned corrupted comment.`;
    }
  }

  const trimmed = line.trimStart();
  if ((trimmed.startsWith("/*") || trimmed.startsWith("*")) && suspiciousPattern.test(trimmed)) {
    const indent = line.slice(0, line.length - trimmed.length);
    if (trimmed.startsWith("/*")) {
      const hasClose = trimmed.includes("*/");
      return hasClose
        ? `${indent}/* NOTE: cleaned corrupted comment. */`
        : `${indent}/* NOTE: cleaned corrupted comment.`;
    }
    if (trimmed.startsWith("*")) {
      const hasClose = trimmed.includes("*/");
      return hasClose
        ? `${indent}* NOTE: cleaned corrupted comment. */`
        : `${indent}* NOTE: cleaned corrupted comment.`;
    }
  }

  return line;
}

let modifiedFiles = 0;
for (const target of targets) {
  if (!fs.existsSync(target)) {
    continue;
  }
  const files = walk(target);
  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const lines = original.split(/\r?\n/);
    const cleaned = lines.map(cleanLine).join("\n");
    if (cleaned !== original) {
      fs.writeFileSync(file, cleaned, "utf8");
      modifiedFiles += 1;
    }
  }
}

console.log(`[cleanup] modified files: ${modifiedFiles}`);