import { expect, test, type Page, type Route } from "@playwright/test";
import { collectRuntimeIssues, expectNoRuntimeIssues } from "./support/runtime";

const ADMIN_UI_TIMEOUT_MS = 15000;

const MOCK_ADMIN_SESSION = {
  adminId: "admin-e2e",
  adminRole: "super_admin",
  permissions: [],
  routePatterns: ["*"],
  homePath: "/admin",
  adminName: "E2E Admin",
  memberStatus: "active",
  authMode: "cookie",
  totpEnabled: false,
};

type AdminRouteHandler = (route: Route, url: URL) => Promise<boolean>;

async function fulfillJson(
  route: Route,
  body: unknown,
  status = 200,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function primeAdminSession(page: Page): Promise<void> {
  await page.addInitScript(() => undefined);
}

async function installAdminApiMocks(
  page: Page,
  handler: AdminRouteHandler,
): Promise<void> {
  await page.route("**/api/health", async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route("**/api/admin/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname.endsWith("/api/admin/auth/verify")) {
      await fulfillJson(route, {
        success: true,
        valid: true,
        session: MOCK_ADMIN_SESSION,
      });
      return;
    }

    if (pathname.endsWith("/api/admin/auth/refresh")) {
      await fulfillJson(route, { success: true, session: MOCK_ADMIN_SESSION });
      return;
    }

    if (await handler(route, url)) {
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

test.describe("Admin system page regressions", () => {
  test("settings page renders reference content without runtime issues", async ({
    page,
  }) => {
    await primeAdminSession(page);
    await installAdminApiMocks(page, async () => false);

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/settings", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText(/ADMIN_KEYS/i).first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(
      page.locator('a[href="/admin/members"]').first(),
    ).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.locator("code").filter({ hasText: "ADMIN_KEYS" }).first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText(/Cookie|cookie|COOKIE/).first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("We use cookies", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Install Gush App", { exact: true })).toHaveCount(0);

    await expectNoRuntimeIssues("/admin/settings", runtimeIssues);
  });

  test("email settings saves the latest draft before sending a test email", async ({
    page,
  }) => {
    await primeAdminSession(page);

    const savePayloads: Record<string, unknown>[] = [];
    const testPayloads: Record<string, unknown>[] = [];

    await installAdminApiMocks(page, async (route, url) => {
      if (
        url.pathname.endsWith("/api/admin/email") &&
        route.request().method() === "GET"
      ) {
        await fulfillJson(route, {
          config: {
            provider: "console",
            from: "old@gush.test",
            webhookUrl: "",
            resendApiKey: "********",
            sendgridApiKey: "",
            smsWebhookUrl: "",
            adminNotifyEmail: "alerts@gush.test",
            testRecipient: "qa@gush.test",
          },
        });
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/email") &&
        route.request().method() === "POST"
      ) {
        const payload = JSON.parse(
          route.request().postData() || "{}",
        ) as Record<string, unknown>;
        savePayloads.push(payload);
        await fulfillJson(route, {
          config: {
            ...payload,
            resendApiKey: payload.resendApiKey ? "********" : "",
            sendgridApiKey: payload.sendgridApiKey ? "********" : "",
            smsWebhookUrl: payload.smsWebhookUrl ? "********" : "",
          },
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/email/test")) {
        testPayloads.push(
          JSON.parse(route.request().postData() || "{}") as Record<
            string,
            unknown
          >,
        );
        await fulfillJson(route, { ok: true });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/email-settings", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const fromInput = page.getByTestId("admin-email-from-input");
    await expect(fromInput).toHaveValue("old@gush.test", {
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await fromInput.fill("latest@gush.test");

    const sendTestButton = page.getByTestId("admin-email-send-test");
    await expect(sendTestButton).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await sendTestButton.click();

    await expect
      .poll(() => savePayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS })
      .toBe(1);
    await expect
      .poll(() => testPayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS })
      .toBe(1);

    expect(savePayloads[0]).toEqual(
      expect.objectContaining({
        from: "latest@gush.test",
        testRecipient: "qa@gush.test",
      }),
    );
    expect(testPayloads).toEqual([{ to: "qa@gush.test" }]);

    await expectNoRuntimeIssues("/admin/email-settings", runtimeIssues);
  });

  test("regions blocks duplicate dial codes before save", async ({ page }) => {
    await primeAdminSession(page);

    let saveRequests = 0;

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/regions")) {
        if (route.request().method() === "GET") {
          await fulfillJson(route, {
            config: { countryCodes: [], lengthRules: {} },
          });
          return true;
        }

        saveRequests += 1;
        await fulfillJson(route, {
          config: { countryCodes: [], lengthRules: {} },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/regions", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page.getByTestId("admin-regions-add-entry").click();
    await page.getByTestId("admin-regions-add-entry").click();

    const inputs = page.locator('input:not([type="file"])');
    await inputs.nth(0).fill("1");
    await inputs.nth(1).fill("United States");
    await inputs.nth(2).fill("+1");
    await inputs.nth(3).fill("Duplicate United States");

    await page.getByTestId("admin-regions-save").click();

    await expect(page.getByTestId("admin-feedback-banner")).toContainText("+1", {
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    expect(saveRequests).toBe(0);

    await expectNoRuntimeIssues("/admin/regions", runtimeIssues);
  });

  test("content generator stays locked in production until admin tools are explicitly enabled", async ({
    page,
  }) => {
    await primeAdminSession(page);

    const payloads: Record<string, unknown>[] = [];

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/generate-content")) {
        payloads.push(
          JSON.parse(route.request().postData() || "{}") as Record<
            string,
            unknown
          >,
        );
        await fulfillJson(route, {
          success: true,
          runId: "run-custom-1",
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/content-generator", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    const lockedState = page.getByTestId("admin-content-generator-locked");
    await expect(lockedState).toBeVisible({ timeout: ADMIN_UI_TIMEOUT_MS });
    await expect(lockedState).toContainText("NEXT_PUBLIC_ADMIN_TOOLS_ENABLED=1");
    await expect(
      page.getByRole("button", { name: /Generate content/i }),
    ).toHaveCount(0);
    expect(payloads).toHaveLength(0);

    await expectNoRuntimeIssues("/admin/content-generator", runtimeIssues);
  });

  test("members workspace syncs slots and updates member status without runtime issues", async ({
    page,
  }) => {
    await primeAdminSession(page);

    const syncPayloads: Array<Record<string, unknown>> = [];
    const statusPayloads: Array<Record<string, unknown>> = [];

    await installAdminApiMocks(page, async (route, url) => {
      if (url.pathname.endsWith("/api/admin/members/meta")) {
        await fulfillJson(route, {
          keySlots: [
            {
              slot: 1,
              configuredRole: "content_admin",
              assignedMemberId: "member-1",
              assignedMemberName: "Content Desk",
              missing: false,
            },
          ],
        });
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/members") &&
        route.request().method() === "GET"
      ) {
        await fulfillJson(route, {
          members: [
            {
              id: "member-1",
              name: "Content Desk",
              email: "content@gush.test",
              role: "content_admin",
              status: "active",
              source: "manual",
              keySlot: 1,
              keySlotStatus: "assigned",
              totpEnabled: true,
              hasTotpSecret: true,
              lastLoginAt: "2026-03-12T08:00:00.000Z",
              createdAt: "2026-03-10T08:00:00.000Z",
              notes: "",
            },
          ],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/members/sync-env")) {
        syncPayloads.push(
          JSON.parse(route.request().postData() || "{}") as Record<
            string,
            unknown
          >,
        );
        await fulfillJson(route, { created: 1 });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/members/member-1/status")) {
        statusPayloads.push(
          JSON.parse(route.request().postData() || "{}") as Record<
            string,
            unknown
          >,
        );
        await fulfillJson(route, { ok: true });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/members", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("content@gush.test")).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByTestId("admin-members-sync-slots").click();
    await expect
      .poll(() => syncPayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS })
      .toBe(1);

    await page.getByTestId("admin-member-status-toggle-member-1").click();
    await expect
      .poll(() => statusPayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS })
      .toBe(1);
    expect(statusPayloads[0]).toEqual({ status: "disabled" });

    await expectNoRuntimeIssues("/admin/members", runtimeIssues);
  });

  test("interactive stories workspace supports filtering and node jumps without runtime issues", async ({
    page,
  }) => {
    await primeAdminSession(page);

    await installAdminApiMocks(page, async (route, url) => {
      if (
        url.pathname.endsWith("/api/admin/interactive-stories") &&
        route.request().method() === "GET"
      ) {
        await fulfillJson(route, {
          stories: [
            {
              id: "story-1",
              slug: "midnight-archive",
              title: "Midnight Archive",
              isPublished: false,
              _count: { nodes: 2, progress: 5 },
              series: { title: "Archive" },
            },
          ],
        });
        return true;
      }

      if (
        url.pathname.endsWith(
          "/api/admin/interactive-stories/story-1/validation",
        )
      ) {
        await fulfillJson(route, {
          validation: {
            ok: true,
            errors: 0,
            warnings: 0,
            issues: { errors: [], warnings: [] },
          },
        });
        return true;
      }

      if (url.pathname.endsWith("/api/admin/interactive-stories/story-1")) {
        await fulfillJson(route, {
          story: {
            id: "story-1",
            slug: "midnight-archive",
            title: "Midnight Archive",
            seriesId: "series-011",
            description: "Suspense branching story.",
            baseContext: "Night shift archive entry point.",
            initialState: { trust: 0, risk: 1, clues: 0 },
            isPublished: false,
            aiEnabled: true,
            initialNodeId: "node-1",
            series: { title: "Archive" },
            nodes: [
              {
                id: "node-1",
                nodeKey: "intro-01",
                title: "Midnight Letter",
                sortOrder: 1,
                baseContext: "You are alone in the office.",
                basePrompt: "Build suspense.",
                fallbackText: "You steady yourself and read the letter.",
                requiredFlags: [],
                blockedFlags: [],
                stateEffects: { risk: 1 },
                isEnding: false,
                aiEnabled: true,
                choices: [
                  {
                    id: "choice-1",
                    choiceKey: "open-letter",
                    label: "Open the letter",
                    description: "Read the contents.",
                    targetNodeId: "node-2",
                    sortOrder: 1,
                    requiredFlags: [],
                    blockedFlags: [],
                    stateEffects: { clues: 1 },
                  },
                ],
              },
              {
                id: "node-2",
                nodeKey: "hallway-02",
                title: "Hallway Footsteps",
                sortOrder: 2,
                baseContext: "Footsteps echo in the hall.",
                basePrompt: "Increase tension.",
                fallbackText: "You turn slowly toward the door.",
                requiredFlags: [],
                blockedFlags: [],
                stateEffects: { trust: -1 },
                isEnding: false,
                aiEnabled: true,
                choices: [],
              },
            ],
          },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/interactive-stories", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await expect(page.getByText("midnight-archive")).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.getByTestId("admin-tab-nodes").click();
    await expect(
      page.locator("button").filter({ hasText: "Midnight Letter" }).first(),
    ).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(
      page.locator("button").filter({ hasText: "Hallway Footsteps" }).first(),
    ).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    const searchInput = page.getByTestId("admin-interactive-node-search");
    await searchInput.fill("hallway");

    await expect(
      page.locator("button").filter({ hasText: "Hallway Footsteps" }).first(),
    ).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(
      page.locator("button").filter({ hasText: "Midnight Letter" }),
    ).toHaveCount(0);

    await searchInput.fill("");
    await page.locator("button").filter({ hasText: "Midnight Letter" }).first().click();
    await page
      .getByRole("button", { name: /跳到 Hallway Footsteps/ })
      .first()
      .click();
    await expect(
      page.locator('input[value="Hallway Footsteps"]').first(),
    ).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await expectNoRuntimeIssues("/admin/interactive-stories", runtimeIssues);
  });

  test("interactive stories AI assist flow can generate, approve, and attach a draft branch", async ({
    page,
  }) => {
    await primeAdminSession(page);

    const generatedNode = {
      id: "node-ai-1",
      storyId: "story-1",
      nodeKey: "midnight-archive-intro-open-letter-ai-draft-01",
      title: "Signal Under Glass",
      body: "A low tone rolls through the archive shelves as the glass case answers your touch.",
      imageUrl: null,
      endingType: null,
      orderIndex: 2,
      baseContext: "A low tone rolls through the archive shelves as the glass case answers your touch.",
      basePrompt: "Keep tension high and teen-safe.",
      fallbackText: "The archive answers with a low metallic hum.",
      requiredFlags: [],
      blockedFlags: [],
      stateEffects: {},
      sortOrder: 2,
      isEnding: false,
      aiEnabled: true,
      generatedByAI: true,
      reviewStatus: "pending_review",
      editorNotes: "AI draft generated from admin assist.",
      choices: [
        {
          id: "choice-ai-1",
          nodeId: "node-ai-1",
          targetNodeId: null,
          choiceKey: "ai-choice-1",
          label: "Trace the reply to its source.",
          description: "Follow the strongest signal first.",
          requiresPremium: false,
          requiresTokens: 0,
          orderIndex: 0,
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: 0,
        },
        {
          id: "choice-ai-2",
          nodeId: "node-ai-1",
          targetNodeId: null,
          choiceKey: "ai-choice-2",
          label: "Seal the cabinet and step back.",
          description: "Play safe before it escalates.",
          requiresPremium: false,
          requiresTokens: 0,
          orderIndex: 1,
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: 1,
        },
      ],
    };

    const storyState = {
      story: {
        id: "story-1",
        slug: "midnight-archive",
        title: "Midnight Archive",
        seriesId: "series-011",
        description: "Suspense branching story.",
        baseContext: "Night shift archive entry point.",
        initialState: { trust: 0, risk: 1, clues: 0 },
        isPublished: false,
        aiEnabled: true,
        initialNodeId: "node-1",
        series: { title: "Archive" },
        generationLogs: [] as Array<Record<string, unknown>>,
        nodes: [
          {
            id: "node-1",
            storyId: "story-1",
            nodeKey: "intro-01",
            title: "Midnight Letter",
            body: "A sealed letter waits under the desk lamp.",
            imageUrl: null,
            endingType: null,
            orderIndex: 1,
            baseContext: "You are alone in the office.",
            basePrompt: "Build suspense.",
            fallbackText: "You steady yourself and read the letter.",
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: { risk: 1 },
            sortOrder: 1,
            isEnding: false,
            aiEnabled: true,
            generatedByAI: false,
            reviewStatus: "approved",
            editorNotes: "",
            choices: [
              {
                id: "choice-1",
                nodeId: "node-1",
                targetNodeId: "node-2",
                choiceKey: "open-letter",
                label: "Open the letter",
                description: "Read the contents.",
                requiresPremium: false,
                requiresTokens: 0,
                orderIndex: 1,
                requiredFlags: [],
                blockedFlags: [],
                stateEffects: { clues: 1 },
                sortOrder: 1,
              },
            ],
          },
          {
            id: "node-2",
            storyId: "story-1",
            nodeKey: "hallway-02",
            title: "Hallway Footsteps",
            body: "Footsteps echo in the hall.",
            imageUrl: null,
            endingType: null,
            orderIndex: 2,
            baseContext: "Footsteps echo in the hall.",
            basePrompt: "Increase tension.",
            fallbackText: "You turn slowly toward the door.",
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: { trust: -1 },
            sortOrder: 2,
            isEnding: false,
            aiEnabled: true,
            generatedByAI: false,
            reviewStatus: "approved",
            editorNotes: "",
            choices: [],
          },
        ],
      },
    };

    const validationPayload = {
      validation: {
        ok: true,
        errors: 0,
        warnings: 0,
        issues: { errors: [], warnings: [] },
      },
    };

    const generatePayloads: Record<string, unknown>[] = [];
    const reviewPayloads: Record<string, unknown>[] = [];
    const attachPayloads: Record<string, unknown>[] = [];

    function currentStoryDetail() {
      return JSON.parse(JSON.stringify(storyState));
    }

    await installAdminApiMocks(page, async (route, url) => {
      if (
        url.pathname.endsWith("/api/admin/interactive-stories") &&
        route.request().method() === "GET"
      ) {
        await fulfillJson(route, {
          stories: [
            {
              id: "story-1",
              slug: "midnight-archive",
              title: "Midnight Archive",
              isPublished: false,
              _count: {
                nodes: storyState.story.nodes.length,
                progress: 5,
              },
              series: { title: "Archive" },
            },
          ],
        });
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/interactive-stories/story-1/validation")
      ) {
        await fulfillJson(route, validationPayload);
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/interactive-stories/story-1") &&
        route.request().method() === "GET"
      ) {
        await fulfillJson(route, currentStoryDetail());
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/interactive-stories/story-1/generate-node") &&
        route.request().method() === "POST"
      ) {
        const payload = JSON.parse(
          route.request().postData() || "{}",
        ) as Record<string, unknown>;
        generatePayloads.push(payload);

        storyState.story.nodes.splice(1, 0, generatedNode);
        storyState.story.generationLogs.unshift({
          id: "log-ai-1",
          nodeId: "node-ai-1",
          choiceId: "choice-1",
          status: "success",
          contentMode: "normal",
          generationType: "admin_next_node_draft",
          provider: "openai",
          model: "gpt-5.4-mini",
          prompt: "prompt",
          response: "{\"title\":\"Signal Under Glass\"}",
          responseJson: {
            title: "Signal Under Glass",
          },
          safetyNotes: "Teen-safe tension and mystery only.",
          reviewStatus: "pending_review",
          errorMessage: null,
          latencyMs: 420,
          node: {
            id: "node-ai-1",
            nodeKey: generatedNode.nodeKey,
            title: generatedNode.title,
          },
          choice: {
            id: "choice-1",
            nodeId: "node-1",
            choiceKey: "open-letter",
            label: "Open the letter",
            node: {
              id: "node-1",
              nodeKey: "intro-01",
              title: "Midnight Letter",
            },
          },
        });

        await fulfillJson(
          route,
          {
            generatedNode: {
              id: "node-ai-1",
              reviewStatus: "pending_review",
            },
            linkedToChoice: false,
          },
          201,
        );
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/interactive-stories/nodes/node-ai-1") &&
        route.request().method() === "PATCH"
      ) {
        const payload = JSON.parse(
          route.request().postData() || "{}",
        ) as Record<string, unknown>;
        reviewPayloads.push(payload);

        const node = storyState.story.nodes.find((item) => item.id === "node-ai-1");
        if (node) {
          node.reviewStatus = "approved";
        }
        const log = storyState.story.generationLogs.find(
          (item) => item.nodeId === "node-ai-1",
        );
        if (log) {
          log.reviewStatus = "approved";
        }

        await fulfillJson(route, {
          node: {
            id: "node-ai-1",
            reviewStatus: "approved",
          },
        });
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/interactive-stories/choices/choice-1") &&
        route.request().method() === "PATCH"
      ) {
        const payload = JSON.parse(
          route.request().postData() || "{}",
        ) as Record<string, unknown>;
        attachPayloads.push(payload);

        const introNode = storyState.story.nodes.find((item) => item.id === "node-1");
        const introChoice = introNode?.choices?.find((item) => item.id === "choice-1");
        if (introChoice) {
          introChoice.targetNodeId = "node-ai-1";
        }

        await fulfillJson(route, {
          choice: {
            id: "choice-1",
            targetNodeId: "node-ai-1",
          },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/interactive-stories", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page.getByTestId("admin-tab-nodes").click();
    await page.locator("button").filter({ hasText: "Midnight Letter" }).first().click();

    await page
      .locator("button")
      .filter({ hasText: "Generate Next Node" })
      .first()
      .click();

    await expect
      .poll(() => generatePayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS })
      .toBe(1);
    expect(generatePayloads[0]).toEqual({
      input: expect.objectContaining({
        fromNodeId: "node-1",
        choiceId: "choice-1",
      }),
    });

    await expect(page.getByText("Signal Under Glass").first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("pending_review").first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await page.locator('select').filter({ has: page.locator('option[value="approved"]') }).first().selectOption("approved");
    await page
      .locator("button")
      .filter({ hasText: "保存节点" })
      .first()
      .click();

    await expect
      .poll(() => reviewPayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS })
      .toBe(1);
    expect(reviewPayloads[0]).toEqual({
      node: expect.objectContaining({
        reviewStatus: "approved",
      }),
    });

    const bindButtons = page
      .locator("button")
      .filter({ hasText: /^绑定分支$/ });
    await bindButtons.first().click();

    await expect
      .poll(() => attachPayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS })
      .toBe(1);
    expect(attachPayloads[0]).toEqual({
      choice: expect.objectContaining({
        targetNodeId: "node-ai-1",
      }),
    });

    await expect(
      page.locator("button").filter({ hasText: "Midnight Letter" }).first(),
    ).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("Open the letter").first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expect(page.getByText("Signal Under Glass").first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });

    await expectNoRuntimeIssues("/admin/interactive-stories", runtimeIssues);
  });

  test("interactive panel review can override final image url before approve", async ({
    page,
  }) => {
    await primeAdminSession(page);

    const panelApprovePayloads: Record<string, unknown>[] = [];
    const storyState = {
      story: {
        id: "story-1",
        slug: "midnight-archive",
        title: "Midnight Archive",
        seriesId: "series-011",
        description: "Suspense branching story.",
        baseContext: "Night shift archive entry point.",
        initialState: { trust: 0, risk: 1, clues: 0 },
        isPublished: false,
        aiEnabled: true,
        initialNodeId: "node-1",
        series: { title: "Archive" },
        generationLogs: [],
        nodes: [
          {
            id: "node-1",
            storyId: "story-1",
            nodeKey: "intro-01",
            title: "Midnight Letter",
            body: "A sealed letter waits under the desk lamp.",
            imageUrl: null,
            endingType: null,
            orderIndex: 1,
            baseContext: "You are alone in the office.",
            basePrompt: "Build suspense.",
            fallbackText: "You steady yourself and read the letter.",
            requiredFlags: [],
            blockedFlags: [],
            stateEffects: { risk: 1 },
            sortOrder: 1,
            isEnding: false,
            aiEnabled: true,
            generatedByAI: false,
            reviewStatus: "approved",
            editorNotes: "",
            panels: [
              {
                id: "panel-1",
                storyId: "story-1",
                nodeId: "node-1",
                panelNumber: 1,
                promptJson: {
                  panelNumber: 1,
                  character: "Courier lead",
                  scene: "Archive desk",
                  camera: "Medium close-up",
                  emotion: "Uneasy focus",
                  action: "Breaking the wax seal",
                  style: "American YA suspense comic",
                  dialogue: "The seal is warmer than it should be.",
                },
                imageUrl: "https://cdn.gush.test/draft/panel-1.png",
                finalImageUrl: null,
                dialogue: "The seal is warmer than it should be.",
                reviewStatus: "pending_review",
                provider: "openai",
                model: "gpt-image-1",
                seed: 42,
              },
            ],
            choices: [],
          },
        ],
      },
    };

    function currentStoryDetail() {
      return JSON.parse(JSON.stringify(storyState));
    }

    await installAdminApiMocks(page, async (route, url) => {
      if (
        url.pathname.endsWith("/api/admin/interactive-stories") &&
        route.request().method() === "GET"
      ) {
        await fulfillJson(route, {
          stories: [
            {
              id: "story-1",
              slug: "midnight-archive",
              title: "Midnight Archive",
              isPublished: false,
              _count: {
                nodes: storyState.story.nodes.length,
                progress: 2,
              },
              series: { title: "Archive" },
            },
          ],
        });
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/interactive-stories/story-1/validation")
      ) {
        await fulfillJson(route, {
          validation: {
            ok: true,
            errors: 0,
            warnings: 0,
            issues: { errors: [], warnings: [] },
          },
        });
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/interactive-stories/story-1") &&
        route.request().method() === "GET"
      ) {
        await fulfillJson(route, currentStoryDetail());
        return true;
      }

      if (
        url.pathname.endsWith("/api/admin/interactive-panels/panel-1/approve") &&
        route.request().method() === "POST"
      ) {
        const payload = JSON.parse(
          route.request().postData() || "{}",
        ) as Record<string, unknown>;
        panelApprovePayloads.push(payload);

        storyState.story.nodes[0].panels[0].reviewStatus = "approved";
        storyState.story.nodes[0].panels[0].finalImageUrl =
          String(
            (payload.panel as Record<string, unknown> | undefined)
              ?.finalImageUrl || "",
          ) || "https://cdn.gush.test/draft/panel-1.png";

        await fulfillJson(route, {
          panel: {
            id: "panel-1",
            reviewStatus: "approved",
            finalImageUrl: storyState.story.nodes[0].panels[0].finalImageUrl,
          },
        });
        return true;
      }

      return false;
    });

    const runtimeIssues = collectRuntimeIssues(page);
    const response = await page.goto("/admin/interactive-stories", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBeTruthy();

    await page.getByTestId("admin-tab-nodes").click();
    await page.locator("button").filter({ hasText: "Midnight Letter" }).first().click();

    const finalUrlInput = page.getByTestId("admin-panel-final-url-panel-1");
    await expect(finalUrlInput).toHaveValue(
      "https://cdn.gush.test/draft/panel-1.png",
      { timeout: ADMIN_UI_TIMEOUT_MS },
    );
    await finalUrlInput.fill("https://cdn.gush.test/final/panel-1-approved.png");

    await page.getByTestId("admin-panel-approve-panel-1").click();

    await expect
      .poll(() => panelApprovePayloads.length, { timeout: ADMIN_UI_TIMEOUT_MS })
      .toBe(1);
    expect(panelApprovePayloads[0]).toEqual({
      panel: {
        finalImageUrl: "https://cdn.gush.test/final/panel-1-approved.png",
      },
    });

    await expect(page.getByText("approved").first()).toBeVisible({
      timeout: ADMIN_UI_TIMEOUT_MS,
    });
    await expectNoRuntimeIssues("/admin/interactive-stories", runtimeIssues);
  });
});
