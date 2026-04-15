import { spawn } from "node:child_process";
import process from "node:process";

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    strict: args.has("--strict"),
  };
}

function runStep(name, command, args, env, useShell = false) {
  return new Promise((resolve, reject) => {
    console.log(`[deploy-gate] step=${name}`);
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: useShell,
      env,
    });

    child.on("error", (error) => reject(error));
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`step failed: ${name} (exit=${code})`));
    });
  });
}

async function run() {
  const { strict } = parseArgs();
  const env = { ...process.env };
  const isWindows = process.platform === "win32";
  const npmCommand = isWindows ? "cmd.exe" : "npm";
  const npmArgs = (scriptName) =>
    isWindows ? ["/d", "/s", "/c", `npm run ${scriptName}`] : ["run", scriptName];

  if (strict) {
    env.OPS_STRICT_CONTENT_AUDIT = "1";
    const hasAdminCredentials = Boolean(
      (env.OPS_ADMIN_EMAIL && env.OPS_ADMIN_PASSWORD) || env.OPS_ADMIN_KEY || env.ADMIN_KEY,
    );
    env.OPS_ADMIN_UI_REQUIRED = hasAdminCredentials ? "1" : "0";
    env.OPS_ADMIN_REQUIRED = hasAdminCredentials ? "1" : "0";
    env.OPS_ROUNDS = env.OPS_ROUNDS || "4";
    env.OPS_IGNORE_WARMUP_ROUNDS = env.OPS_IGNORE_WARMUP_ROUNDS || "1";
    env.OPS_ALLOWED_BACKEND_SLOW_SAMPLES = env.OPS_ALLOWED_BACKEND_SLOW_SAMPLES || "1";
    console.log("[deploy-gate] mode=strict");
    console.log(
      "[deploy-gate] strict defaults: advanced health + observability remain opt-in via OPS_REQUIRE_ADVANCED_HEALTH=1 / WATCHDOG_REQUIRE_OBSERVABILITY=1 / SEC_REQUIRE_OBSERVABILITY_ENDPOINT=1",
    );
    if (!hasAdminCredentials) {
      console.log("[deploy-gate] strict note: admin credentials not provided; admin smoke runs as non-blocking");
    }
  } else {
    console.log("[deploy-gate] mode=standard");
  }

  await runStep("post-deploy", npmCommand, npmArgs("ops:post-deploy"), env);
  await runStep("security-baseline", npmCommand, npmArgs("ops:security-baseline"), env);
  await runStep("watchdog", npmCommand, npmArgs("ops:oncall-watchdog"), env);
  await runStep("admin-session", npmCommand, npmArgs("ops:admin-smoke"), env);

  console.log("[deploy-gate] all steps passed");
}

run().catch((error) => {
  console.error(`[deploy-gate] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
