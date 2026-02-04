const fs = require("fs");
const path = require("path");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000/api/health";
const REPORT_DIR = path.join(__dirname, "reports");

async function fetchWithTimeout(url, timeoutMs = 5000, attempts = 3) {
  const controller = new AbortController();
  for (let i = 0; i < attempts; i += 1) {
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      if (i === attempts - 1) {
        return { ok: false, status: 0, error: err?.message || "NETWORK_ERROR" };
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

async function run() {
  const startedAt = new Date().toISOString();
  const backend = await fetchWithTimeout(BACKEND_URL, 6000);
  const frontend = await fetchWithTimeout(FRONTEND_URL, 6000);

  const report = {
    startedAt,
    backend: { url: BACKEND_URL, ...backend },
    frontend: { url: FRONTEND_URL, ...frontend },
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(REPORT_DIR, `health-check-${ts}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf8");

  const summary = [
    `[health-check] backend: ${backend.ok ? "OK" : "FAIL"} (${backend.status})`,
    `[health-check] frontend: ${frontend.ok ? "OK" : "FAIL"} (${frontend.status})`,
    `[health-check] report: ${file}`,
  ];
  console.log(summary.join("\n"));

  if (!backend.ok || !frontend.ok) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error("[health-check] failed", err);
  process.exit(1);
});
