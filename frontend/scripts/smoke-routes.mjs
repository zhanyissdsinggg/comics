import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");

const ROUTES = ["/", "/search", "/store", "/rankings", "/admin/login"];

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to allocate port"));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

async function waitForServer(baseUrl, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.ok) {
        return;
      }
    } catch {
      // keep waiting
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Timed out waiting for Next.js server");
}

async function run() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const nextBin = path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: frontendRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[smoke] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[smoke] ${chunk}`);
  });

  try {
    await waitForServer(baseUrl);

    for (const route of ROUTES) {
      const res = await fetch(`${baseUrl}${route}`);
      if (!res.ok) {
        throw new Error(`Route ${route} returned ${res.status}`);
      }
      const html = await res.text();
      if (!html.includes("<html")) {
        throw new Error(`Route ${route} did not return HTML`);
      }
      console.log(`[smoke] ${route} -> ${res.status}`);
    }

    console.log("[smoke] all routes passed");
  } finally {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error("[smoke] failed", error);
  process.exit(1);
});
