import { spawn } from "node:child_process";
import process from "node:process";

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
      reject(new Error(`release-all-live-full failed (exit=${code})`));
    });
  });
}

async function main() {
  const env = {
    ...process.env,
    OPS_RELEASE_REQUIRE_FULL: "1",
  };

  const isWindows = process.platform === "win32";
  const command = isWindows ? "node.exe" : "node";
  await run(command, ["scripts/ops/release-all-live.mjs"], env);
}

main().catch((error) => {
  console.error(
    `[release-all-full] ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
