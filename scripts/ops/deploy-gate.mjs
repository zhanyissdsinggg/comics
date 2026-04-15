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
    env.OPS_REQUIRE_ADVANCED_HEALTH = "1";
    env.OPS_STRICT_CONTENT_AUDIT = "1";
    env.WATCHDOG_REQUIRE_OBSERVABILITY = "1";
    env.SEC_REQUIRE_OBSERVABILITY_ENDPOINT = "1";
    env.OPS_ADMIN_UI_REQUIRED = "1";
    env.OPS_ADMIN_REQUIRED = "1";
    console.log("[deploy-gate] mode=strict");
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
