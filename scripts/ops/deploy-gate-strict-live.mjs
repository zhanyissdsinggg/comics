import { spawn } from "node:child_process";
import process from "node:process";

const DEFAULT_LIVE_URL = "https://www.gushcomics.com";

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      env,
    });
    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`strict live deploy gate failed (exit=${code})`));
    });
  });
}

async function main() {
  const backendUrl = String(process.env.BACKEND_URL || "").trim() || DEFAULT_LIVE_URL;
  const frontendUrl = String(process.env.FRONTEND_URL || "").trim() || DEFAULT_LIVE_URL;
  const env = {
    ...process.env,
    BACKEND_URL: backendUrl,
    FRONTEND_URL: frontendUrl,
  };

  console.log(`[deploy-gate:strict:live] backend=${backendUrl}`);
  console.log(`[deploy-gate:strict:live] frontend=${frontendUrl}`);

  const isWindows = process.platform === "win32";
  const command = isWindows ? "node.exe" : "node";
  await run(command, ["scripts/ops/deploy-gate.mjs", "--strict"], env);
}

main().catch((error) => {
  console.error(`[deploy-gate:strict:live] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
