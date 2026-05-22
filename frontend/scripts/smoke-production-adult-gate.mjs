import { chromium } from "@playwright/test";

const BASE_URL =
  process.env.GUSH_PROD_BASE_URL ||
  process.env.READER_PROD_BASE_URL ||
  "https://www.gushcomics.com";

const ADULT_TITLES = ["Midnight Heat", "After Hours Letters", "Vampire Oath"];
const NORMAL_TITLES = ["The Last Kingdom", "Velvet Archive", "Solar Wind"];
const VISIBILITY_ROUTES = ["/", "/rankings"];
const LEAK_ONLY_ROUTES = ["/search?q=midnight"];

function parseCookieSet(name) {
  const raw = String(process.env[name] || "").trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${name}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function buildMatureStatus({ verified, matureModeEnabled }) {
  return encodeURIComponent(
    JSON.stringify({
      verified,
      provider: "local-gate",
      region: "global",
      expiresAt: null,
      referenceId: null,
      verifiedAt: verified ? "2026-05-10T12:00:00.000Z" : null,
      matureModeEnabled,
      hideAdultHistory: !matureModeEnabled,
    }),
  );
}

async function addCookies(context, cookies) {
  await context.clearCookies();
  if (cookies.length > 0) {
    await context.addCookies(
      cookies.map((cookie) => ({
        ...cookie,
        url: BASE_URL,
      })),
    );
  }
}

async function assertNoAdultLeak(page, route, label) {
  const response = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: "networkidle",
  });
  if (!response?.ok()) {
    throw new Error(`[${label}] ${route} returned ${response?.status() || "unknown"}`);
  }

  const bodyText = await page.locator("body").innerText();
  for (const title of ADULT_TITLES) {
    if (bodyText.includes(title)) {
      throw new Error(`[${label}] leaked adult title "${title}" on ${route}`);
    }
  }
}

async function assertNormalCatalogVisible(page, route, label) {
  const response = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: "networkidle",
  });
  if (!response?.ok()) {
    throw new Error(`[${label}] ${route} returned ${response?.status() || "unknown"}`);
  }

  const bodyText = await page.locator("body").innerText();
  const hasNormal = NORMAL_TITLES.some((title) => bodyText.includes(title));
  if (!hasNormal) {
    throw new Error(`[${label}] missing expected normal catalog content on ${route}`);
  }
}

async function assertAdultVisible(page, route, label) {
  const response = await page.goto(`${BASE_URL}${route}`, {
    waitUntil: "networkidle",
  });
  if (!response?.ok()) {
    throw new Error(`[${label}] ${route} returned ${response?.status() || "unknown"}`);
  }

  const bodyText = await page.locator("body").innerText();
  const hasAdult = ADULT_TITLES.some((title) => bodyText.includes(title));
  if (!hasAdult) {
    throw new Error(`[${label}] expected adult content on ${route} but none was visible`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1800 },
  });
  const page = await context.newPage();
  const signedInUnverifiedCookies = parseCookieSet(
    "GUSH_PROD_SIGNED_IN_COOKIES_JSON",
  );
  const signedInVerifiedCookies = parseCookieSet(
    "GUSH_PROD_MATURE_VERIFIED_COOKIES_JSON",
  );

  try {
    await addCookies(context, [
      { name: "mn_session", value: "forged-session" },
      { name: "mn_adult_confirmed", value: "0" },
      { name: "mn_adult_mode", value: "0" },
      { name: "mn_age_rule", value: "global" },
    ]);
    for (const route of [...VISIBILITY_ROUTES, ...LEAK_ONLY_ROUTES]) {
      await assertNoAdultLeak(page, route, "forged-session");
    }
    for (const route of VISIBILITY_ROUTES) {
      await assertNormalCatalogVisible(page, route, "forged-session");
    }
    console.log("PASS forged session without verification");

    await addCookies(context, [
      { name: "mn_session", value: "" },
      { name: "mn_adult_confirmed", value: "1" },
      { name: "mn_adult_mode", value: "1" },
      {
        name: "mn_mature_status",
        value: buildMatureStatus({
          verified: true,
          matureModeEnabled: true,
        }),
      },
      { name: "mn_age_rule", value: "global" },
    ]);
    for (const route of [...VISIBILITY_ROUTES, ...LEAK_ONLY_ROUTES]) {
      await assertNoAdultLeak(page, route, "forged-cookies");
    }
    for (const route of VISIBILITY_ROUTES) {
      await assertNormalCatalogVisible(page, route, "forged-cookies");
    }
    console.log("PASS forged mature cookies without session");

    if (signedInUnverifiedCookies.length > 0) {
      await addCookies(context, signedInUnverifiedCookies);
      for (const route of [...VISIBILITY_ROUTES, ...LEAK_ONLY_ROUTES]) {
        await assertNoAdultLeak(page, route, "signed-in-unverified");
      }
      for (const route of VISIBILITY_ROUTES) {
        await assertNormalCatalogVisible(page, route, "signed-in-unverified");
      }
      console.log("PASS signed-in but not mature-verified");
    } else {
      console.log(
        "SKIP signed-in-unverified adult smoke: set GUSH_PROD_SIGNED_IN_COOKIES_JSON to enable it.",
      );
    }

    if (signedInVerifiedCookies.length > 0) {
      await addCookies(context, signedInVerifiedCookies);
      for (const route of ["/adult", "/search?q=midnight", "/rankings"]) {
        await assertAdultVisible(page, route, "signed-in-verified");
      }
      console.log("PASS signed-in mature verified adult mode");
    } else {
      console.log(
        "SKIP signed-in-verified adult smoke: set GUSH_PROD_MATURE_VERIFIED_COOKIES_JSON to enable it.",
      );
    }

    console.log(`Production adult gate smoke passed against ${BASE_URL}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
