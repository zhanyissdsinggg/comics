import { spawn } from "node:child_process";
import process from "node:process";

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} is required for strict full deploy gate`);
  }
  return value;
}

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
      reject(new Error(`strict full deploy gate failed (exit=${code})`));
    });
  });
}

async function main() {
  const backendUrl = requireEnv("BACKEND_URL");
  const frontendUrl = requireEnv("FRONTEND_URL");
  const observabilityKey = requireEnv("OBSERVABILITY_KEY");
  const adminEmail = String(process.env.OPS_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = String(process.env.OPS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "").trim();
  const adminKey = String(process.env.OPS_ADMIN_KEY || process.env.ADMIN_KEY || "").trim();
  const hasAdminCredentials = (adminEmail && adminPassword) || adminKey;

  if (!hasAdminCredentials) {
    throw new Error(
      "OPS_ADMIN_EMAIL+OPS_ADMIN_PASSWORD or OPS_ADMIN_KEY/ADMIN_KEY is required for strict full deploy gate",
    );
  }

  const env = {
    ...process.env,
    BACKEND_URL: backendUrl,
    FRONTEND_URL: frontendUrl,
    OBSERVABILITY_KEY: observabilityKey,
    ...(adminEmail && adminPassword
      ? {
          OPS_ADMIN_EMAIL: adminEmail,
          OPS_ADMIN_PASSWORD: adminPassword,
        }
      : {
          OPS_ADMIN_KEY: adminKey,
        }),
    OPS_REQUIRE_ADVANCED_HEALTH: "1",
    WATCHDOG_REQUIRE_OBSERVABILITY: "1",
    SEC_REQUIRE_OBSERVABILITY_ENDPOINT: "1",
    OPS_ADMIN_REQUIRED: "1",
    OPS_ADMIN_UI_REQUIRED: "1",
  };

  const isWindows = process.platform === "win32";
  const command = isWindows ? "node.exe" : "node";
  const scriptPath = "scripts/ops/deploy-gate.mjs";
  const args = [scriptPath, "--strict"];

  console.log("[deploy-gate:strict:full] running strict gate with advanced health + observability enforcement");
  await run(command, args, env);
}

main().catch((error) => {
  console.error(
    `[deploy-gate:strict:full] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
