import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const ADMIN_ROOT = path.join(ROOT, "backend", "src", "modules", "admin");
const METHODS = new Set(["Get", "Post", "Patch", "Delete", "Put"]);
const DEFAULT_MARKDOWN_OUT = "docs/operations/admin-route-inventory.md";
const DEFAULT_JSON_OUT = "docs/operations/admin-route-inventory.json";

function walk(dir) {
  const result = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".controller.ts")) {
      result.push(fullPath);
    }
  }

  return result;
}

function cleanPath(basePath, routePath) {
  const base = String(basePath || "").replace(/^\/+|\/+$/g, "");
  const route = String(routePath || "").replace(/^\/+|\/+$/g, "");
  const joined = [base, route].filter(Boolean).join("/");
  return `/${joined}`.replace(/\/+/g, "/");
}

function parseDecoratedValue(line) {
  const match = line.match(/@(?:Controller|Get|Post|Patch|Delete|Put)\(([^)]*)\)/);
  if (!match) {
    return "";
  }

  const raw = match[1].trim();
  if (!raw) {
    return "";
  }

  const quoted = raw.match(/^['"]([^'"]*)['"]$/);
  return quoted ? quoted[1] : raw;
}

function classify(method, fullPath) {
  if (method === "Get") {
    return "read";
  }

  if (fullPath.includes("/auth/")) {
    return "session";
  }

  if (fullPath.includes("refund") || fullPath.includes("adjust") || fullPath.includes("/billing") || fullPath.includes("/revenue")) {
    return "billing";
  }

  if (fullPath.includes("upload") || fullPath.includes("image") || fullPath.includes("generate-content")) {
    return "content-pipeline";
  }

  return "mutation";
}

function parseController(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  let controllerBase = "";
  const routes = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (line.startsWith("@Controller(")) {
      controllerBase = parseDecoratedValue(line);
      continue;
    }

    const methodMatch = line.match(/^@(Get|Post|Patch|Delete|Put)\(/);
    if (!methodMatch) {
      continue;
    }

    const method = methodMatch[1];
    if (!METHODS.has(method)) {
      continue;
    }

    const routePath = parseDecoratedValue(line);
    const fullPath = cleanPath(controllerBase, routePath);
    routes.push({
      method: method.toUpperCase(),
      category: classify(method, fullPath),
      path: fullPath,
      file: path.relative(ROOT, filePath).replace(/\\/g, "/"),
      line: index + 1,
    });
  }

  return routes;
}

function buildSummary(entries) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
  }
  return counts;
}

function toMarkdown(entries) {
  const lines = [];
  const summary = buildSummary(entries);

  lines.push("# Admin Route Inventory");
  lines.push("");
  lines.push("Generated from `backend/src/modules/admin/**/*.controller.ts`.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total routes: ${entries.length}`);
  lines.push(`- Read routes: ${summary.get("read") || 0}`);
  lines.push(`- Session routes: ${summary.get("session") || 0}`);
  lines.push(`- Billing routes: ${summary.get("billing") || 0}`);
  lines.push(`- Content-pipeline routes: ${summary.get("content-pipeline") || 0}`);
  lines.push(`- Other mutation routes: ${summary.get("mutation") || 0}`);
  lines.push("");
  lines.push("## Routes");
  lines.push("");
  lines.push("| Method | Category | Path | Source |");
  lines.push("| --- | --- | --- | --- |");

  for (const entry of entries) {
    lines.push(`| ${entry.method} | ${entry.category} | \`${entry.path}\` | \`${entry.file}:${entry.line}\` |`);
  }

  lines.push("");
  return lines.join("\n");
}

function resolveOutputPath(envName, fallback) {
  const value = String(process.env[envName] || "").trim();
  return value || fallback;
}

function writeOutput(filePath, contents) {
  const resolvedPath = path.resolve(ROOT, filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, contents, "utf8");
  console.log(`[ops-admin-routes] wrote ${filePath}`);
}

if (!fs.existsSync(ADMIN_ROOT)) {
  throw new Error(`admin module root not found: ${ADMIN_ROOT}`);
}

const entries = walk(ADMIN_ROOT)
  .flatMap((filePath) => parseController(filePath))
  .sort((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method));

const markdown = `${toMarkdown(entries)}\n`;
const json = `${JSON.stringify(entries, null, 2)}\n`;
const markdownOut = resolveOutputPath("OPS_ADMIN_ROUTE_INVENTORY_OUT", DEFAULT_MARKDOWN_OUT);
const jsonOut = resolveOutputPath("OPS_ADMIN_ROUTE_INVENTORY_JSON_OUT", DEFAULT_JSON_OUT);
const printToStdout = process.env.OPS_ADMIN_ROUTE_INVENTORY_STDOUT === "1";

writeOutput(markdownOut, markdown);
writeOutput(jsonOut, json);
console.log(`[ops-admin-routes] total routes=${entries.length}`);

if (printToStdout) {
  console.log(markdown);
}
