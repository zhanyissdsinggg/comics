import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { TEST_BACKEND_BASE_URL } from "./tests/e2e/support/mockBackendConfig";

const configuredWorkers = Number(process.env.PLAYWRIGHT_WORKERS || 1);
const usePrebuiltServer = process.env.PLAYWRIGHT_USE_PREBUILT === "1";
const crossEnvBin = join("node_modules", ".bin", "cross-env.cmd");
const configuredPort = Number(process.env.PLAYWRIGHT_PORT || 4173);
const playwrightPort =
  Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 4173;
const baseUrl = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers:
    Number.isFinite(configuredWorkers) && configuredWorkers > 0
      ? configuredWorkers
      : 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: baseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: usePrebuiltServer
      ? `${crossEnvBin} NEXT_DIST_DIR=.next-playwright npx next start -p ${playwrightPort} -H 127.0.0.1`
      : `${crossEnvBin} NEXT_DIST_DIR=.next-playwright npm run build && ${crossEnvBin} NEXT_DIST_DIR=.next-playwright npx next start -p ${playwrightPort} -H 127.0.0.1`,
    env: {
      ...process.env,
      API_BASE_URL: process.env.API_BASE_URL || TEST_BACKEND_BASE_URL,
      NEXT_PUBLIC_API_BASE_URL:
        process.env.NEXT_PUBLIC_API_BASE_URL || TEST_BACKEND_BASE_URL,
      NEXT_PUBLIC_BASE_URL:
        process.env.NEXT_PUBLIC_BASE_URL || baseUrl,
      NEXT_PUBLIC_SITE_URL:
        process.env.NEXT_PUBLIC_SITE_URL || baseUrl,
      NEXT_PUBLIC_REQUIRE_LOGIN_FOR_ADULT:
        process.env.NEXT_PUBLIC_REQUIRE_LOGIN_FOR_ADULT || "false",
    },
    url: baseUrl,
    reuseExistingServer: false,
    timeout: usePrebuiltServer ? 60000 : 180000,
  },
});
