import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const requireFromFrontend = createRequire(path.resolve(ROOT, "frontend/package.json"));
const { chromium } = requireFromFrontend("@playwright/test");

const DEFAULT_FRONTEND_URL = "https://www.gushcomics.com";
const DEFAULT_OUTPUT_JSON = "frontend/.tmp-admin-audit/live-interactions/latest.json";
const DEFAULT_OUTPUT_TXT = "frontend/.tmp-admin-audit/live-interactions/latest.txt";
const DEFAULT_TIMEOUT_MS = 15_000;

function normalizeBaseUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return DEFAULT_FRONTEND_URL;
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function parseSetCookieHeader(headerValue) {
  const items = [];
  let current = "";
  let inExpires = false;

  for (let index = 0; index < headerValue.length; index += 1) {
    const char = headerValue[index];
    const next = headerValue.slice(index, index + 8).toLowerCase();

    if (next === "expires=") {
      inExpires = true;
    }

    if (char === "," && !inExpires) {
      items.push(current.trim());
      current = "";
      continue;
    }

    current += char;

    if (inExpires && char === ";") {
      inExpires = false;
    }
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items
    .map((entry) => {
      const [pair = ""] = entry.split(";");
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex <= 0) {
        return null;
      }

      return {
        name: pair.slice(0, separatorIndex).trim(),
        value: pair.slice(separatorIndex + 1).trim(),
      };
    })
    .filter(Boolean);
}

async function loginAndBuildCookies(baseUrl, adminKey) {
  const response = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ adminKey }),
  });

  const body = await response.text();
  if (response.status !== 201) {
    throw new Error(`admin login failed: status=${response.status} body=${body}`);
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("admin login succeeded but no session cookie was returned");
  }

  const hostname = new URL(baseUrl).hostname;
  return parseSetCookieHeader(setCookie).map((cookie) => ({
    ...cookie,
    domain: hostname,
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  }));
}

async function waitForPopup(page, action) {
  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: DEFAULT_TIMEOUT_MS }),
    action(),
  ]);
  await popup.waitForLoadState("domcontentloaded");
  await popup.waitForLoadState("networkidle").catch(() => {});
  return popup;
}

function summarizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || "Unknown error");
}

function buildChecks(baseUrl) {
  return [
    {
      id: "dashboard.quick-series",
      route: "/admin",
      description: "仪表盘快捷入口能进入作品管理",
      run: async (page) => {
        await page
          .locator('a[href="/admin/series"]')
          .filter({ hasText: "去作品管理" })
          .first()
          .click();
        await page.waitForURL(`${baseUrl}/admin/series`, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "快捷入口应该进入作品列表主页面。",
        };
      },
    },
    {
      id: "dashboard.quick-creators",
      route: "/admin",
      description: "仪表盘快捷入口能进入创作者页",
      run: async (page) => {
        await page
          .locator('a[href="/admin/creators"]')
          .filter({ hasText: "去创作者页" })
          .first()
          .click();
        await page.waitForURL(`${baseUrl}/admin/creators`, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "快捷入口应该进入创作者工作区。",
        };
      },
    },
    {
      id: "dashboard.quick-merchandising",
      route: "/admin",
      description: "仪表盘快捷入口能进入内容编排",
      run: async (page) => {
        await page
          .locator('a[href="/admin/merchandising"]')
          .filter({ hasText: "去内容编排" })
          .first()
          .click();
        await page.waitForURL(`${baseUrl}/admin/merchandising`, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "快捷入口应该进入首页编排工作区。",
        };
      },
    },
    {
      id: "series.detail",
      route: "/admin/series",
      description: "作品卡片的详情按钮能进入后台详情页",
      run: async (page) => {
        const card = page.locator("article").filter({ hasText: "Crimson Tide" }).first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await card.getByRole("button", { name: "详情", exact: true }).click();
        await page.waitForURL(/\/admin\/series\/[^/]+$/, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "详情按钮应该进入作品后台详情页。",
        };
      },
    },
    {
      id: "series.episodes",
      route: "/admin/series",
      description: "作品卡片的章节按钮能进入章节管理页",
      run: async (page) => {
        const card = page.locator("article").filter({ hasText: "Crimson Tide" }).first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await card.getByRole("button", { name: "章节", exact: true }).click();
        await page.waitForURL(/\/admin\/series\/[^/]+\/episodes$/, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "章节按钮应该进入章节管理页。",
        };
      },
    },
    {
      id: "series.storefront",
      route: "/admin/series",
      description: "已发布作品的前台页按钮能打开真实前台作品页",
      run: async (page) => {
        const card = page.locator("article").filter({ hasText: "Crimson Tide" }).first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        const popup = await waitForPopup(page, () =>
          card.getByRole("button", { name: "前台页", exact: true }).click(),
        );

        try {
          return {
            finalUrl: popup.url(),
            note: "前台页按钮应该在新窗口打开真实作品页。",
          };
        } finally {
          await popup.close();
        }
      },
    },
    {
      id: "creators.edit-spotlight",
      route: "/admin/creators",
      description: "创作者卡片的编辑代表作品能跳到作品详情署名区",
      run: async (page) => {
        const card = page.locator("article").filter({ hasText: "Mira Dane" }).first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await card.getByRole("button", { name: "编辑代表作品", exact: true }).click();
        await page.waitForURL(/\/admin\/series\/[^/]+#creator$/, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "编辑代表作品应该直接定位到作品详情的创作者区块。",
        };
      },
    },
    {
      id: "creators.storefront-profile",
      route: "/admin/creators",
      description: "创作者卡片的前台创作者页按钮能打开真实前台页",
      run: async (page) => {
        const card = page.locator("article").filter({ hasText: "Mira Dane" }).first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        const popup = await waitForPopup(page, () =>
          card.getByRole("button", { name: "打开前台创作者页", exact: true }).click(),
        );

        try {
          return {
            finalUrl: popup.url(),
            note: "应该打开真实前台创作者页，而不是假说明页。",
          };
        } finally {
          await popup.close();
        }
      },
    },
    {
      id: "creators.storefront-series",
      route: "/admin/creators",
      description: "创作者卡片的前台代表作品按钮能打开真实作品页",
      run: async (page) => {
        const card = page.locator("article").filter({ hasText: "Mira Dane" }).first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        const popup = await waitForPopup(page, () =>
          card.getByRole("button", { name: "查看前台代表作品", exact: true }).click(),
        );

        try {
          return {
            finalUrl: popup.url(),
            note: "代表作品按钮应该直接打开前台作品页。",
          };
        } finally {
          await popup.close();
        }
      },
    },
    {
      id: "merchandising.home-preview",
      route: "/admin/merchandising",
      description: "内容编排页能直接打开线上首页",
      run: async (page) => {
        const popup = await waitForPopup(page, () =>
          page.getByRole("button", { name: "查看线上首页", exact: true }).click(),
        );

        try {
          return {
            finalUrl: popup.url(),
            note: "首页预览应该打开线上首页。",
          };
        } finally {
          await popup.close();
        }
      },
    },
    {
      id: "merchandising.recommendations",
      route: "/admin/merchandising",
      description: "内容编排页能跳到发现配置页",
      run: async (page) => {
        await page.getByRole("button", { name: "打开发现配置", exact: true }).click();
        await page.waitForURL(`${baseUrl}/admin/recommendations`, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "这个按钮应该进入推荐位配置工作区。",
        };
      },
    },
    {
      id: "merchandising.hero-edit",
      route: "/admin/merchandising",
      description: "主视觉候选作品的编辑按钮能跳到作品详情",
      run: async (page) => {
        const card = page
          .locator("article")
          .filter({ hasText: "Crimson Tide" })
          .filter({ hasText: "候选分" })
          .first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await card.getByRole("button", { name: "编辑作品", exact: true }).click();
        await page.waitForURL(/\/admin\/series\/[^/]+$/, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "应该直接进入作品后台详情页。",
        };
      },
    },
    {
      id: "merchandising.hero-storefront",
      route: "/admin/merchandising",
      description: "主视觉候选作品的前台按钮能打开真实作品页",
      run: async (page) => {
        const card = page
          .locator("article")
          .filter({ hasText: "Crimson Tide" })
          .filter({ hasText: "候选分" })
          .first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        const popup = await waitForPopup(page, () =>
          card.getByRole("button", { name: "查看前台页", exact: true }).click(),
        );

        try {
          return {
            finalUrl: popup.url(),
            note: "候选作品前台按钮应该打开真实作品页。",
          };
        } finally {
          await popup.close();
        }
      },
    },
  ];
}

function validateCheckResult(id, finalUrl) {
  const pathname = new URL(finalUrl).pathname;

  if (id === "dashboard.quick-series") {
    return pathname === "/admin/series";
  }

  if (id === "dashboard.quick-creators") {
    return pathname === "/admin/creators";
  }

  if (id === "dashboard.quick-merchandising") {
    return pathname === "/admin/merchandising";
  }

  if (id === "series.detail") {
    return /\/admin\/series\/[^/]+$/.test(pathname);
  }

  if (id === "series.episodes") {
    return /\/admin\/series\/[^/]+\/episodes$/.test(pathname);
  }

  if (id === "series.storefront") {
    return /\/series\/[^/]+$/.test(pathname);
  }

  if (id === "creators.edit-spotlight") {
    return /\/admin\/series\/[^/]+$/.test(pathname);
  }

  if (id === "creators.storefront-profile") {
    return /\/creators\/[^/]+$/.test(pathname);
  }

  if (id === "creators.storefront-series") {
    return /\/series\/[^/]+$/.test(pathname);
  }

  if (id === "merchandising.home-preview") {
    return pathname === "/";
  }

  if (id === "merchandising.recommendations") {
    return pathname === "/admin/recommendations";
  }

  if (id === "merchandising.hero-edit") {
    return /\/admin\/series\/[^/]+$/.test(pathname);
  }

  if (id === "merchandising.hero-storefront") {
    return /\/series\/[^/]+$/.test(pathname);
  }

  return false;
}

async function runCheck(context, baseUrl, check, artifactsDir) {
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}${check.route}`, { waitUntil: "networkidle" });
    const details = await check.run(page);
    const finalUrl = String(details?.finalUrl || page.url());
    const ok = validateCheckResult(check.id, finalUrl);

    return {
      id: check.id,
      route: check.route,
      description: check.description,
      ok,
      finalUrl,
      note: details?.note || "",
    };
  } catch (error) {
    const slug = check.id.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const screenshotPath = path.join(artifactsDir, `${slug}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

    return {
      id: check.id,
      route: check.route,
      description: check.description,
      ok: false,
      finalUrl: page.url(),
      note: `failure screenshot: ${path.relative(ROOT, screenshotPath).replace(/\\/g, "/")}`,
      error: summarizeError(error),
    };
  } finally {
    await page.close();
  }
}

function formatTextReport(summary) {
  const lines = [];
  lines.push(`frontend=${summary.frontendUrl}`);
  lines.push(`checks=${summary.results.length}`);
  lines.push(`passed=${summary.passed}`);
  lines.push(`failed=${summary.failed}`);
  lines.push("");

  for (const result of summary.results) {
    lines.push(`[${result.ok ? "PASS" : "FAIL"}] ${result.id}`);
    lines.push(`route: ${result.route}`);
    lines.push(`description: ${result.description}`);
    lines.push(`finalUrl: ${result.finalUrl}`);
    if (result.note) {
      lines.push(`note: ${result.note}`);
    }
    if (result.error) {
      lines.push(`error: ${result.error}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

async function run() {
  const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  const adminKey = String(process.env.OPS_ADMIN_KEY || process.env.ADMIN_KEY || "").trim();
  const outputJson = path.resolve(ROOT, process.env.OPS_ADMIN_UI_SMOKE_JSON_OUT || DEFAULT_OUTPUT_JSON);
  const outputTxt = path.resolve(ROOT, process.env.OPS_ADMIN_UI_SMOKE_TXT_OUT || DEFAULT_OUTPUT_TXT);
  const artifactsDir = path.dirname(outputJson);

  if (!adminKey) {
    throw new Error("OPS_ADMIN_KEY or ADMIN_KEY is required");
  }

  ensureDirectory(outputJson);
  ensureDirectory(outputTxt);

  const cookies = await loginAndBuildCookies(frontendUrl, adminKey);
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    await context.addCookies(cookies);

    const checks = buildChecks(frontendUrl);
    const results = [];

    for (const check of checks) {
      const result = await runCheck(context, frontendUrl, check, artifactsDir);
      results.push(result);
      console.log(`[ops-admin-ui] ${result.ok ? "PASS" : "FAIL"} ${result.id} -> ${result.finalUrl}`);
      if (result.error) {
        console.log(`[ops-admin-ui] ${result.id} error=${result.error}`);
      }
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      frontendUrl,
      passed: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results,
    };

    fs.writeFileSync(outputJson, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    fs.writeFileSync(outputTxt, formatTextReport(summary), "utf8");

    console.log(`[ops-admin-ui] wrote ${path.relative(ROOT, outputJson).replace(/\\/g, "/")}`);
    console.log(`[ops-admin-ui] wrote ${path.relative(ROOT, outputTxt).replace(/\\/g, "/")}`);

    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(`[ops-admin-ui] fatal=${summarizeError(error)}`);
  process.exitCode = 1;
});
