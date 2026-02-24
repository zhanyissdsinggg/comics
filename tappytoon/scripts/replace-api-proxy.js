const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const apiDir = path.join(root, "app", "api");
const proxyPath = path.join(root, "lib", "apiProxy.js");

function listRouteFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listRouteFiles(full));
    } else if (entry.isFile() && entry.name === "route.js") {
      files.push(full);
    }
  }
  return files;
}

function buildImport(fromFile) {
  const fromDir = path.dirname(fromFile);
  const rel = path.relative(fromDir, proxyPath).replace(/\\/g, "/");
  const relPath = rel.startsWith(".") ? rel : `./${rel}`;
  return relPath.replace(/\.js$/, "");
}

function writeProxy(file) {
  const importPath = buildImport(file);
  const content = `import { handler } from "${importPath}";

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
`;
  fs.writeFileSync(file, content, "utf8");
}

function run() {
  if (!fs.existsSync(apiDir)) {
    console.log("[replace-api-proxy] app/api not found, skip.");
    return;
  }
  const files = listRouteFiles(apiDir);
  files.forEach(writeProxy);
  console.log(`[replace-api-proxy] updated ${files.length} route files.`);
}

run();
