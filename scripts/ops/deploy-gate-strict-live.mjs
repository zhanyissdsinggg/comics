import { spawn } from "node:child_process";
import process from "node:process";
import { execFileSync } from "node:child_process";

const DEFAULT_LIVE_URL = "https://www.gushcomics.com";

function readGitValue(args) {
  try {
    return String(
      execFileSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ).trim();
  } catch {
    return "";
  }
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
      reject(new Error(`strict live deploy gate failed (exit=${code})`));
    });
  });
}

async function main() {
  const backendUrl = String(process.env.BACKEND_URL || "").trim() || DEFAULT_LIVE_URL;
  const frontendUrl = String(process.env.FRONTEND_URL || "").trim() || DEFAULT_LIVE_URL;
  const originMainCommit =
    readGitValue(["rev-parse", "origin/main"]) || readGitValue(["rev-parse", "main"]);
  const originRemoteUrl = readGitValue(["remote", "get-url", "origin"]);
  const expectedRepo = originRemoteUrl
    .replace(/^git@github\.com:/i, "")
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .trim();
  const env = {
    ...process.env,
    BACKEND_URL: backendUrl,
    FRONTEND_URL: frontendUrl,
    EXPECT_FRONTEND_COMMIT:
      String(process.env.EXPECT_FRONTEND_COMMIT || "").trim() || originMainCommit,
    EXPECT_FRONTEND_BRANCH:
      String(process.env.EXPECT_FRONTEND_BRANCH || "").trim() || "main",
    EXPECT_FRONTEND_REPO:
      String(process.env.EXPECT_FRONTEND_REPO || "").trim() || expectedRepo,
  };

  console.log(`[deploy-gate:strict:live] backend=${backendUrl}`);
  console.log(`[deploy-gate:strict:live] frontend=${frontendUrl}`);
  if (env.EXPECT_FRONTEND_COMMIT) {
    console.log(
      `[deploy-gate:strict:live] expect frontend commit=${env.EXPECT_FRONTEND_COMMIT}`,
    );
  }
  if (env.EXPECT_FRONTEND_REPO) {
    console.log(
      `[deploy-gate:strict:live] expect frontend repo=${env.EXPECT_FRONTEND_REPO}`,
    );
  }
  console.log(
    `[deploy-gate:strict:live] expect frontend branch=${env.EXPECT_FRONTEND_BRANCH}`,
  );

  const isWindows = process.platform === "win32";
  const command = isWindows ? "node.exe" : "node";
  await run(command, ["scripts/ops/deploy-gate.mjs", "--strict"], env);
}

main().catch((error) => {
  console.error(`[deploy-gate:strict:live] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
