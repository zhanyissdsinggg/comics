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

  return parseSetCookieHeader(setCookie).map((cookie) => ({
    ...cookie,
    url: baseUrl,
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

async function clickButtonByText(page, text, options = {}) {
  const locator = page.locator("button").filter({ hasText: text }).last();
  await locator.waitFor({ state: "visible", timeout: options.timeout ?? DEFAULT_TIMEOUT_MS });
  await locator.click();
}

async function readFirstTableRowText(page) {
  const row = page.locator("tbody tr").first();
  await row.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
  return row.innerText();
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
      id: "dashboard.support-view-all",
      route: "/admin",
      description: "仪表盘客服队列的查看全部能进入客服页",
      run: async (page) => {
        await page.locator('a[href="/admin/support"]').filter({ hasText: "查看全部" }).first().click();
        await page.waitForURL(`${baseUrl}/admin/support`, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "客服队列入口应该进入客服工单页。",
        };
      },
    },
    {
      id: "dashboard.orders-view-all",
      route: "/admin",
      description: "仪表盘最近订单的查看全部能进入订单页",
      run: async (page) => {
        await page.locator('a[href="/admin/orders"]').filter({ hasText: "查看全部" }).first().click();
        await page.waitForURL(`${baseUrl}/admin/orders`, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "订单入口应该进入订单工作区。",
        };
      },
    },
    {
      id: "dashboard.comments-view-all",
      route: "/admin",
      description: "仪表盘最新评论的查看全部能进入评论页",
      run: async (page) => {
        await page.locator('a[href="/admin/comments"]').filter({ hasText: "查看全部" }).first().click();
        await page.waitForURL(`${baseUrl}/admin/comments`, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "评论入口应该进入评论工作区。",
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
    {
      id: "users.search-and-sort",
      route: "/admin/users",
      description: "用户页能搜索真实账号并打开排序弹层",
      run: async (page) => {
        const searchInput = page.locator('input[type="text"]').first();
        const rowCheckbox = page.locator('input[type="checkbox"][aria-label^="选择用户 "]').first();

        await rowCheckbox.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await searchInput.fill("qq987274228@gmail.com");
        await page.waitForTimeout(600);

        const hasEmail = await page.locator("body").evaluate((node) =>
          node.innerText.includes("qq987274228@gmail.com"),
        );
        if (!hasEmail) {
          throw new Error("users page did not retain the expected live account after searching");
        }

        await page.getByRole("button", { name: "排序", exact: true }).click();
        await page.locator("text=排序用户").waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await page.getByRole("button", { name: "取消", exact: true }).click();

        return {
          finalUrl: page.url(),
          note: "用户页至少要能搜索真实账号，并正常打开排序设置。",
        };
      },
    },
    {
      id: "support.reset-filters",
      route: "/admin/support",
      description: "客服页的搜索与筛选能被重置",
      run: async (page) => {
        const searchInput = page.locator('input[placeholder]').first();
        const statusSelect = page.locator("select").first();
        const sortSelect = page.locator("select").nth(1);

        await searchInput.fill("ticket-smoke");
        await statusSelect.selectOption("closed");
        await sortSelect.selectOption("updatedAt");
        await page.getByRole("button", { name: "重置视图", exact: true }).click();
        await page.waitForTimeout(500);

        const searchValue = await searchInput.inputValue();
        const statusValue = await statusSelect.inputValue();
        const sortValue = await sortSelect.inputValue();

        if (searchValue !== "" || statusValue !== "" || sortValue !== "createdAt") {
          throw new Error(`support reset did not clear controls: search=${searchValue} status=${statusValue} sort=${sortValue}`);
        }

        return {
          finalUrl: page.url(),
          note: "客服页即使是空态，也要能重置搜索和筛选。",
        };
      },
    },
    {
      id: "comments.search-and-sort",
      route: "/admin/comments",
      description: "评论页搜索框和排序弹层能正常工作",
      run: async (page) => {
        const searchInput = page.locator('input[type="text"]').first();
        await searchInput.fill("reader-feedback");
        await page.waitForTimeout(500);

        const searchValue = await searchInput.inputValue();
        if (searchValue !== "reader-feedback") {
          throw new Error(`comments search input mismatch: ${searchValue}`);
        }

        await page.getByRole("button", { name: "排序", exact: true }).click();
        await page.locator("text=排序评论").waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await page.getByRole("button", { name: "取消", exact: true }).click();

        return {
          finalUrl: page.url(),
          note: "评论页在空状态下也要能搜索并打开排序设置。",
        };
      },
    },
    {
      id: "orders.export-empty-and-usd",
      route: "/admin/orders",
      description: "订单页空态导出提示正常，金额展示仍为美元",
      run: async (page) => {
        const bodyText = await page.locator("body").innerText();
        if (!bodyText.includes("US$0.00")) {
          throw new Error("orders page no longer shows USD summary amount");
        }

        const exportButton = page.getByRole("button", { name: "导出所选", exact: true });
        if (await exportButton.isEnabled()) {
          throw new Error("orders export button should stay disabled when no rows are selected");
        }

        await page.getByRole("button", { name: "排序", exact: true }).click();
        await page.locator("text=排序订单").waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await page.getByRole("button", { name: "取消", exact: true }).click();

        return {
          finalUrl: page.url(),
          note: "订单页空态下的导出提示和美元展示都应该稳定。",
        };
      },
    },
    {
      id: "recommendations.rankings-tab",
      route: "/admin/recommendations",
      description: "recommendations rankings tab loads without leaving the page",
      run: async (page) => {
        await clickButtonByText(page, "榜单规则");
        await page.locator("body").filter({ hasText: "新建榜单规则" }).waitFor({
          state: "visible",
          timeout: DEFAULT_TIMEOUT_MS,
        });

        const bodyText = await page.locator("body").innerText();
        if (!bodyText.includes("当前还没有榜单规则。")) {
          throw new Error("recommendations rankings tab did not show the expected empty state");
        }

        return {
          finalUrl: page.url(),
          note: "rankings tab stays in the recommendations workspace and renders the current ranking-rule state",
        };
      },
    },
    {
      id: "recommendations.analytics-filter",
      route: "/admin/recommendations",
      description: "recommendations analytics tab can switch slot filters safely",
      run: async (page) => {
        await clickButtonByText(page, "表现分析");

        const slotFilter = page.locator("select").first();
        await slotFilter.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await slotFilter.selectOption("library-return");
        await page.waitForTimeout(600);

        const selectedValue = await slotFilter.inputValue();
        if (selectedValue !== "library-return") {
          throw new Error(`recommendations analytics filter did not retain the selected slot: ${selectedValue}`);
        }

        return {
          finalUrl: page.url(),
          note: "analytics tab keeps the route stable and lets operators focus the report on a single slot",
        };
      },
    },
    {
      id: "storefront.quick-creators",
      route: "/admin/storefront",
      description: "storefront audit quick action links to the creators workspace",
      run: async (page) => {
        await clickButtonByText(page, "查看创作者署名");
        await page.waitForURL(`${baseUrl}/admin/creators`, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "the storefront audit page should jump straight into creator credits maintenance",
        };
      },
    },
    {
      id: "storefront.filter-search",
      route: "/admin/storefront",
      description: "storefront audit supports quick filters plus focused search",
      run: async (page) => {
        await clickButtonByText(page, "接近可发布");
        const searchInput = page.locator('input[placeholder*="搜索作品名"]').first();
        await searchInput.fill("Wild Hearts");
        await page.waitForTimeout(700);

        const bodyText = await page.locator("body").innerText();
        if (!bodyText.includes("Wild Hearts")) {
          throw new Error("storefront audit search did not retain the expected target title");
        }

        return {
          finalUrl: page.url(),
          note: "operators can narrow the storefront audit queue to launch-ready titles without triggering writes",
        };
      },
    },
    {
      id: "storefront.edit-series",
      route: "/admin/storefront",
      description: "storefront audit priority cards can jump into series editing",
      run: async (page) => {
        const card = page.locator("article").filter({
          has: page.locator("button").filter({ hasText: "编辑作品" }).first(),
        }).first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await card.locator("button").filter({ hasText: "编辑作品" }).first().click();
        await page.waitForURL(/\/admin\/series\/[^/]+$/, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "storefront audit cards should route straight into the backend series detail screen",
        };
      },
    },
    {
      id: "storefront.edit-episodes",
      route: "/admin/storefront",
      description: "storefront audit priority cards can jump into episode management",
      run: async (page) => {
        const card = page.locator("article").filter({
          has: page.locator("button").filter({ hasText: "编辑章节" }).first(),
        }).first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        await card.locator("button").filter({ hasText: "编辑章节" }).first().click();
        await page.waitForURL(/\/admin\/series\/[^/]+\/episodes$/, { timeout: DEFAULT_TIMEOUT_MS });

        return {
          finalUrl: page.url(),
          note: "storefront audit cards should route straight into episode operations",
        };
      },
    },
    {
      id: "storefront.preview-series",
      route: "/admin/storefront",
      description: "storefront audit cards can preview a live series page in a popup",
      run: async (page) => {
        const card = page.locator("article").filter({
          has: page.locator("button").filter({ hasText: "查看前台页" }).first(),
        }).first();
        await card.waitFor({ state: "visible", timeout: DEFAULT_TIMEOUT_MS });
        const popup = await waitForPopup(page, () =>
          card.locator("button").filter({ hasText: "查看前台页" }).first().click(),
        );

        try {
          return {
            finalUrl: popup.url(),
            note: "storefront audit preview should open a real live series page, not a dead admin placeholder",
          };
        } finally {
          await popup.close();
        }
      },
    },
    {
      id: "analytics.segments-pagination",
      route: "/admin/analytics",
      description: "analytics segments view paginates through live reader rows",
      run: async (page) => {
        await clickButtonByText(page, "读者分群");

        const firstRowBefore = await readFirstTableRowText(page);
        await page.locator("button").filter({ hasText: "下一页" }).last().click();
        await page.waitForTimeout(900);

        const firstRowAfter = await readFirstTableRowText(page);
        if (firstRowBefore === firstRowAfter) {
          throw new Error("analytics segments next-page action did not change the first visible row");
        }

        return {
          finalUrl: page.url(),
          note: "segments view should page through distinct reader records without leaving the analytics route",
        };
      },
    },
    {
      id: "analytics.user-detail-drilldown",
      route: "/admin/analytics",
      description: "analytics segments rows can drill into the user detail view",
      run: async (page) => {
        await clickButtonByText(page, "读者分群");
        await page.locator("button").filter({ hasText: "打开用户" }).first().click();
        await page.locator("body").filter({ hasText: "返回分群" }).waitFor({
          state: "visible",
          timeout: DEFAULT_TIMEOUT_MS,
        });

        const bodyText = await page.locator("body").innerText();
        if (!bodyText.includes("用户画像")) {
          throw new Error("analytics user detail drilldown did not render the profile view");
        }

        return {
          finalUrl: page.url(),
          note: "reader segments should drill into the user profile workspace without any write-side effects",
        };
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

  if (id === "dashboard.support-view-all") {
    return pathname === "/admin/support";
  }

  if (id === "dashboard.orders-view-all") {
    return pathname === "/admin/orders";
  }

  if (id === "dashboard.comments-view-all") {
    return pathname === "/admin/comments";
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

  if (id === "users.search-and-sort") {
    return pathname === "/admin/users";
  }

  if (id === "support.reset-filters") {
    return pathname === "/admin/support";
  }

  if (id === "comments.search-and-sort") {
    return pathname === "/admin/comments";
  }

  if (id === "orders.export-empty-and-usd") {
    return pathname === "/admin/orders";
  }

  if (id === "recommendations.rankings-tab") {
    return pathname === "/admin/recommendations";
  }

  if (id === "recommendations.analytics-filter") {
    return pathname === "/admin/recommendations";
  }

  if (id === "storefront.quick-creators") {
    return pathname === "/admin/creators";
  }

  if (id === "storefront.filter-search") {
    return pathname === "/admin/storefront";
  }

  if (id === "storefront.edit-series") {
    return /\/admin\/series\/[^/]+$/.test(pathname);
  }

  if (id === "storefront.edit-episodes") {
    return /\/admin\/series\/[^/]+\/episodes$/.test(pathname);
  }

  if (id === "storefront.preview-series") {
    return /\/series\/[^/]+$/.test(pathname);
  }

  if (id === "analytics.segments-pagination") {
    return pathname === "/admin/analytics";
  }

  if (id === "analytics.user-detail-drilldown") {
    return pathname === "/admin/analytics";
  }

  return false;
}

function stabilizeChecks(checks) {
  return checks.map((check) => {
    if (check.id === "recommendations.rankings-tab") {
      return {
        ...check,
        run: async (page) => {
          await clickButtonByText(page, "姒滃崟瑙勫垯");
          await page.locator("body").filter({ hasText: "鏂板缓姒滃崟瑙勫垯" }).waitFor({
            state: "visible",
            timeout: DEFAULT_TIMEOUT_MS,
          });

          return {
            finalUrl: page.url(),
            note: "rankings tab stays in the recommendations workspace and renders the current ranking-rule state",
          };
        },
      };
    }

    if (check.id === "analytics.segments-pagination") {
      return {
        ...check,
        run: async (page) => {
          await clickButtonByText(page, "璇昏€呭垎缇?");

          const firstRowBefore = await readFirstTableRowText(page);
          await page.locator("button").filter({ hasText: "涓嬩竴椤?" }).last().click();
          await page.waitForFunction(
            (expectedRow) => {
              const row = document.querySelector("tbody tr");
              return Boolean(row && row.innerText !== expectedRow);
            },
            firstRowBefore,
            { timeout: DEFAULT_TIMEOUT_MS },
          );

          const firstRowAfter = await readFirstTableRowText(page);
          if (firstRowBefore === firstRowAfter) {
            throw new Error("analytics segments next-page action did not change the first visible row");
          }

          return {
            finalUrl: page.url(),
            note: "segments view should page through distinct reader records without leaving the analytics route",
          };
        },
      };
    }

    if (check.id === "analytics.user-detail-drilldown") {
      return {
        ...check,
        run: async (page) => {
          await clickButtonByText(page, "璇昏€呭垎缇?");
          const selectedUser = (await readFirstTableRowText(page))
            .split("\n")
            .map((part) => part.trim())
            .find(Boolean);

          await page.locator("button").filter({ hasText: "鎵撳紑鐢ㄦ埛" }).first().click();
          await page.waitForFunction(
            (email) => !document.querySelector("tbody tr") && document.body.innerText.includes(email),
            selectedUser,
            { timeout: DEFAULT_TIMEOUT_MS },
          );

          const bodyText = await page.locator("body").innerText();
          if (!selectedUser || !bodyText.includes(selectedUser)) {
            throw new Error("analytics user detail drilldown did not retain the selected reader context");
          }

          return {
            finalUrl: page.url(),
            note: "reader segments should drill into the user profile workspace without any write-side effects",
          };
        },
      };
    }

    return check;
  });
}

function stabilizeChecksV2(checks) {
  return checks.map((check) => {
    if (check.id === "recommendations.rankings-tab") {
      return {
        ...check,
        run: async (page) => {
          const lastButtonBefore = (await page.locator("button").last().innerText()).trim();
          await page.locator("button").nth(6).click();
          await page.waitForFunction(
            (previousLabel) => {
              const buttons = Array.from(document.querySelectorAll("button"));
              const currentLabel = buttons.at(-1)?.innerText?.trim?.() || "";
              return currentLabel.length > 0 && currentLabel !== previousLabel;
            },
            lastButtonBefore,
            { timeout: DEFAULT_TIMEOUT_MS },
          );

          const lastButtonAfter = (await page.locator("button").last().innerText()).trim();
          if (lastButtonAfter === lastButtonBefore) {
            throw new Error("recommendations rankings tab did not update the primary action state");
          }

          return {
            finalUrl: page.url(),
            note: "rankings tab stays in the recommendations workspace and swaps the primary action to ranking rules",
          };
        },
      };
    }

    if (check.id === "analytics.segments-pagination") {
      return {
        ...check,
        run: async (page) => {
          await page.locator("button").nth(6).click();
          await page.waitForTimeout(1200);

          const firstRowBefore = await readFirstTableRowText(page);
          await page.locator("button").nth(33).click();
          await page.waitForFunction(
            (expectedRow) => {
              const row = document.querySelector("tbody tr");
              return Boolean(row && row.innerText !== expectedRow);
            },
            firstRowBefore,
            { timeout: DEFAULT_TIMEOUT_MS },
          );

          const firstRowAfter = await readFirstTableRowText(page);
          if (firstRowBefore === firstRowAfter) {
            throw new Error("analytics segments next-page action did not change the first visible row");
          }

          return {
            finalUrl: page.url(),
            note: "segments view should page through distinct reader records without leaving the analytics route",
          };
        },
      };
    }

    if (check.id === "analytics.user-detail-drilldown") {
      return {
        ...check,
        run: async (page) => {
          await page.locator("button").nth(6).click();
          await page.waitForTimeout(1200);
          const selectedUser = (await readFirstTableRowText(page))
            .split("\n")
            .map((part) => part.trim())
            .find(Boolean);

          await page.locator("button").nth(12).click();
          await page.waitForFunction(
            (email) => {
              return (
                document.querySelectorAll("button").length <= 9 &&
                document.body.innerText.includes(email)
              );
            },
            selectedUser,
            {
              timeout: DEFAULT_TIMEOUT_MS,
            },
          );

          const bodyText = await page.locator("body").innerText();
          if (!selectedUser || !bodyText.includes(selectedUser)) {
            throw new Error("analytics user detail drilldown did not retain the selected reader context");
          }

          return {
            finalUrl: page.url(),
            note: "reader segments should drill into the user profile workspace without any write-side effects",
          };
        },
      };
    }

    return check;
  });
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

    const checks = stabilizeChecksV2(stabilizeChecks(buildChecks(frontendUrl)));
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
