import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CRITICAL_ROUTES } from "./critical-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const buildIdPath = path.join(frontendRoot, ".next", "BUILD_ID");

const ROUTES = CRITICAL_ROUTES;

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
  if (!fs.existsSync(buildIdPath)) {
    throw new Error(`Missing production build artifact at ${buildIdPath}. Run "npm --prefix frontend run build" first.`);
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const nextBin = path.join(frontendRoot, "node_modules", "next", "dist", "bin", "next");
  if (!fs.existsSync(nextBin)) {
    throw new Error(`Unable to find Next.js CLI at ${nextBin}. Run "npm --prefix frontend install" first.`);
  }

  let stdoutLog = "";
  let stderrLog = "";
  const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: frontendRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });

  child.stdout.on("data", (chunk) => {
    stdoutLog += chunk.toString();
    process.stdout.write(`[smoke] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    stderrLog += chunk.toString();
    process.stderr.write(`[smoke] ${chunk}`);
  });

  const childExit = new Promise((_, reject) => {
    child.once("error", (error) => {
      reject(new Error(`Failed to start Next.js smoke server: ${error.message}`));
    });
    child.once("exit", (code, signal) => {
      reject(
        new Error(
          [
            `Next.js smoke server exited before checks completed (code=${code ?? "null"}, signal=${signal ?? "null"}).`,
            stdoutLog ? `stdout:\n${stdoutLog.trim()}` : "",
            stderrLog ? `stderr:\n${stderrLog.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
      );
    });
  });

  try {
    await Promise.race([waitForServer(baseUrl), childExit]);

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
    if (!child.killed && child.exitCode === null) {
      child.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error("[smoke] failed", error);
  process.exit(1);
});
