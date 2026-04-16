import process from "node:process";

const DEFAULT_OWNER = "zhanyissdsinggg";
const DEFAULT_REPO = "comics";
const DEFAULT_WORKFLOW_ID = "261803988";
const DEFAULT_POLL_SECONDS = 10;
const DEFAULT_TIMEOUT_MINUTES = 30;

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  if (!arg) {
    return fallback;
  }
  return arg.slice(prefix.length) || fallback;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "gush-ops-workflow-watch",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`request failed: ${response.status} ${url} body=${text}`);
  }
  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const owner = readArg("owner", process.env.GH_OWNER || DEFAULT_OWNER);
  const repo = readArg("repo", process.env.GH_REPO || DEFAULT_REPO);
  const workflowId = readArg("workflow", process.env.GH_WORKFLOW_ID || DEFAULT_WORKFLOW_ID);
  const pollSeconds = Number(readArg("poll", process.env.GH_POLL_SECONDS || `${DEFAULT_POLL_SECONDS}`));
  const timeoutMinutes = Number(
    readArg("timeout", process.env.GH_TIMEOUT_MINUTES || `${DEFAULT_TIMEOUT_MINUTES}`),
  );
  const branch = readArg("branch", process.env.GH_BRANCH || "main");

  const pollMs = Number.isFinite(pollSeconds) && pollSeconds > 0 ? pollSeconds * 1000 : DEFAULT_POLL_SECONDS * 1000;
  const timeoutMs =
    Number.isFinite(timeoutMinutes) && timeoutMinutes > 0
      ? timeoutMinutes * 60 * 1000
      : DEFAULT_TIMEOUT_MINUTES * 60 * 1000;
  const startTime = Date.now();

  console.log(
    `[ops-workflow-watch] owner=${owner} repo=${repo} workflow=${workflowId} branch=${branch} poll=${pollMs}ms timeout=${timeoutMs}ms`,
  );

  let runId = "";
  while (Date.now() - startTime < timeoutMs) {
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?branch=${encodeURIComponent(
      branch,
    )}&per_page=5`;
    const payload = await fetchJson(url);
    const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
    if (runs.length === 0) {
      console.log("[ops-workflow-watch] no runs yet, waiting...");
      await sleep(pollMs);
      continue;
    }

    const latest = runs[0];
    runId = String(latest.id || "");
    const status = String(latest.status || "unknown");
    const conclusion = String(latest.conclusion || "");
    const htmlUrl = String(latest.html_url || "");
    const eventName = String(latest.event || "");
    const createdAt = String(latest.created_at || "");
    console.log(
      `[ops-workflow-watch] run=${runId} event=${eventName} createdAt=${createdAt} status=${status} conclusion=${conclusion || "n/a"} ${htmlUrl}`,
    );

    if (status === "completed") {
      if (conclusion === "success") {
        console.log("[ops-workflow-watch] workflow completed successfully");
        return;
      }
      throw new Error(`workflow completed with conclusion=${conclusion || "unknown"} run=${runId}`);
    }

    await sleep(pollMs);
  }

  throw new Error(
    `timeout waiting workflow run completion (lastRun=${runId || "none"}, timeoutMs=${timeoutMs})`,
  );
}

run().catch((error) => {
  console.error(
    `[ops-workflow-watch] fatal=${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});

