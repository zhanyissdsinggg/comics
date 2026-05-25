import { Injectable } from "@nestjs/common";
import { getAppConfig } from "../../common/config/app-config";

type ContentMode = "normal" | "adult";

type AiChoice = {
  id: string;
  key: string;
  label: string;
};

type GenerateInput = {
  story: {
    id: string;
    title: string;
    baseContext: string;
  };
  node: {
    id: string;
    title: string;
    baseContext: string;
    basePrompt: string;
    fallbackText: string;
  };
  selectedChoice: {
    id: string;
    key: string;
    label: string;
  } | null;
  state: Record<string, unknown>;
  choices: AiChoice[];
};

type GenerateDraftNodeInput = {
  story: {
    id: string;
    title: string;
    genre: string;
    targetAudience: string;
    contentMode: ContentMode;
    baseContext: string;
  };
  currentNode: {
    id: string;
    key: string;
    title: string;
    body: string;
    baseContext: string;
    basePrompt: string;
  };
  selectedChoice: {
    id: string;
    key: string;
    label: string;
    description: string;
  };
  previousNodes: Array<{
    id: string;
    key: string;
    title: string;
    body: string;
  }>;
  desiredLength?: number;
};

export type StoryboardPanelOutput = {
  panelNumber: number;
  character: string;
  scene: string;
  camera: string;
  emotion: string;
  action: string;
  style: string;
  dialogue: string;
};

type GenerateStoryboardInput = {
  story: {
    id: string;
    title: string;
    genre: string;
    targetAudience: string;
    contentMode: ContentMode;
  };
  node: {
    id: string;
    key: string;
    title: string;
    body: string;
  };
  previousNodes: Array<{
    id: string;
    key: string;
    title: string;
    body: string;
  }>;
  selectedChoice: {
    id: string;
    key: string;
    label: string;
    description: string;
  } | null;
  desiredPanelCount?: number;
};

export type GeneratePanelImageInput = {
  story: {
    id: string;
    title: string;
    genre: string;
    targetAudience: string;
    contentMode: ContentMode;
  };
  node: {
    id: string;
    key: string;
    title: string;
    body: string;
  };
  panel: StoryboardPanelOutput;
  promptJson: Record<string, unknown>;
  seed?: number | null;
};

export type GenerateOutput = {
  content: string;
  choiceLabelOverrides: Record<string, string>;
  status: "success" | "fallback" | "skipped";
  provider: string;
  model: string;
  prompt: string;
  rawResponse: string;
  errorMessage: string | null;
  latencyMs: number | null;
};

export type DraftChoiceOutput = {
  label: string;
  description: string;
};

export type GenerateDraftNodeOutput = {
  title: string;
  body: string;
  choices: DraftChoiceOutput[];
  safetyNotes: string;
  responseJson: Record<string, unknown> | null;
  status: "success" | "fallback" | "skipped";
  provider: string;
  model: string;
  prompt: string;
  rawResponse: string;
  errorMessage: string | null;
  latencyMs: number | null;
};

export type GenerateStoryboardOutput = {
  panels: StoryboardPanelOutput[];
  safetyNotes: string;
  responseJson: Record<string, unknown> | null;
  status: "success" | "fallback" | "skipped";
  provider: string;
  model: string;
  prompt: string;
  rawResponse: string;
  errorMessage: string | null;
  latencyMs: number | null;
};

export type GeneratePanelImageOutput = {
  imageBase64: string;
  revisedPrompt: string;
  provider: string;
  model: string;
  prompt: string;
  rawResponse: string;
  errorMessage: string | null;
  status: "success" | "fallback" | "skipped";
  latencyMs: number | null;
};

type ParsedAiPayload = Record<string, unknown>;

type OpenAiJsonCallResult = {
  status: "success" | "fallback" | "skipped";
  provider: string;
  model: string;
  prompt: string;
  rawResponse: string;
  messageContent: string;
  errorMessage: string | null;
  latencyMs: number | null;
};

type OpenAiImageCallResult = {
  status: "success" | "fallback" | "skipped";
  provider: string;
  model: string;
  prompt: string;
  rawResponse: string;
  imageBase64: string;
  revisedPrompt: string;
  errorMessage: string | null;
  latencyMs: number | null;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeMultilineText(value: unknown): string {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

@Injectable()
export class InteractiveAiService {
  private parseJsonPayload(raw: string): ParsedAiPayload | null {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }
      return parsed as ParsedAiPayload;
    } catch {
      return null;
    }
  }

  private extractAssistantContent(raw: string): string {
    const parsedOuter = this.parseJsonPayload(raw);
    if (!parsedOuter) {
      return "";
    }

    const maybeChoices = parsedOuter.choices;
    if (Array.isArray(maybeChoices)) {
      const firstChoice = maybeChoices[0] as
        | { message?: { content?: unknown } }
        | undefined;
      const messageContent = firstChoice?.message?.content;
      if (typeof messageContent === "string") {
        return messageContent;
      }
      if (Array.isArray(messageContent)) {
        const text = messageContent
          .map((part) =>
            typeof part === "string"
              ? part
              : typeof part === "object" && part && "text" in part
                ? String((part as { text?: unknown }).text || "")
                : "",
          )
          .join("");
        return text.trim();
      }
    }

    if (
      typeof parsedOuter.title !== "undefined"
      || typeof parsedOuter.body !== "undefined"
      || typeof parsedOuter.content !== "undefined"
      || typeof parsedOuter.panels !== "undefined"
    ) {
      return raw;
    }

    return "";
  }

  private normalizeChoiceOverrides(
    value: unknown,
    allowedChoiceIds: Set<string>,
  ): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const result: Record<string, string> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (!allowedChoiceIds.has(key)) {
        continue;
      }
      const text = normalizeText(raw);
      if (!text) {
        continue;
      }
      result[key] = text.slice(0, 80);
    }
    return result;
  }

  private normalizeDraftChoices(value: unknown): DraftChoiceOutput[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const result: DraftChoiceOutput[] = [];
    for (const item of value) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        continue;
      }
      const label = normalizeText((item as { label?: unknown }).label);
      const description = normalizeText(
        (item as { description?: unknown }).description,
      );
      if (!label) {
        continue;
      }
      result.push({
        label: label.slice(0, 80),
        description: description.slice(0, 200),
      });
      if (result.length >= 3) {
        break;
      }
    }
    return result;
  }

  private normalizeStoryboardPanels(value: unknown): StoryboardPanelOutput[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const panels: StoryboardPanelOutput[] = [];
    for (const item of value) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        continue;
      }

      const panel = item as Record<string, unknown>;
      const panelNumber = Number.parseInt(
        String(panel.panel_number || panel.panelNumber || panels.length + 1),
        10,
      );
      const nextPanel: StoryboardPanelOutput = {
        panelNumber:
          Number.isFinite(panelNumber) && panelNumber > 0
            ? panelNumber
            : panels.length + 1,
        character: truncate(normalizeText(panel.character), 300),
        scene: truncate(normalizeText(panel.scene), 500),
        camera: truncate(normalizeText(panel.camera), 200),
        emotion: truncate(normalizeText(panel.emotion), 200),
        action: truncate(normalizeText(panel.action), 300),
        style: truncate(normalizeText(panel.style), 200),
        dialogue: truncate(normalizeMultilineText(panel.dialogue), 500),
      };

      if (
        !nextPanel.character
        || !nextPanel.scene
        || !nextPanel.camera
        || !nextPanel.emotion
        || !nextPanel.action
        || !nextPanel.style
      ) {
        continue;
      }

      panels.push(nextPanel);
      if (panels.length >= 3) {
        break;
      }
    }

    return panels
      .sort((left, right) => left.panelNumber - right.panelNumber)
      .map((panel, index) => ({
        ...panel,
        panelNumber: index + 1,
      }));
  }

  private buildRuntimePrompt(input: GenerateInput): string {
    const stateJson = JSON.stringify(input.state || {});
    const choicesJson = JSON.stringify(
      input.choices.map((choice) => ({
        id: choice.id,
        key: choice.key,
        label: choice.label,
      })),
    );
    const selectedChoice = input.selectedChoice
      ? `${input.selectedChoice.label} (${input.selectedChoice.key})`
      : "none";

    return [
      "You are writing one segment for an interactive fiction system.",
      "Do not break canon, do not introduce unrelated subplots, and keep continuity strict.",
      "",
      `Story title: ${input.story.title}`,
      `Story context: ${input.story.baseContext}`,
      `Current node title: ${input.node.title}`,
      `Current node context: ${input.node.baseContext}`,
      `Current node writing hint: ${input.node.basePrompt}`,
      `Selected choice: ${selectedChoice}`,
      `Current state JSON: ${stateJson}`,
      `Available next choices JSON: ${choicesJson}`,
      "",
      "Output JSON only, no markdown:",
      "{",
      '  "content": "2-4 sentences, concise and vivid. Keep it under 120 words.",',
      '  "choiceLabelOverrides": {',
      '    "<choice-id>": "optional rewritten label, keep meaning unchanged"',
      "  }",
      "}",
    ].join("\n");
  }

  private buildDraftNodeSystemPrompt(contentMode: ContentMode): string {
    if (contentMode === "adult") {
      return [
        "You generate draft interactive-fiction nodes for an internal editorial workflow.",
        "Return JSON only.",
        "Adult-mode generation is isolated from normal-mode generation.",
        "All characters must be adults. Never include minors, age ambiguity, incest, coercion, sexual violence, exploitative content, or illegal sexual content.",
        "Do not create images, comic panels, or publishing-ready copy.",
      ].join(" ");
    }

    return [
      "You generate draft interactive-fiction nodes for an internal editorial workflow.",
      "Return JSON only.",
      "Normal-mode generation is isolated from adult-mode generation.",
      "This story must be teen-safe for a U.S. teen audience. No explicit sexual content, nudity, fetish content, pornography, erotic framing, adult sexual innuendo, grooming, or suggestive adult content.",
      "Do not create images, comic panels, or publishing-ready copy.",
    ].join(" ");
  }

  private buildStoryboardSystemPrompt(contentMode: ContentMode): string {
    if (contentMode === "adult") {
      return [
        "You create internal storyboard JSON for interactive comic panels.",
        "Return JSON only.",
        "Adult-mode storyboard generation is isolated from normal-mode generation.",
        "All characters must be adults.",
        "Do not include any text baked into the image, captions, sound effects, or speech bubbles rendered in art.",
      ].join(" ");
    }

    return [
      "You create internal storyboard JSON for interactive comic panels.",
      "Return JSON only.",
      "Normal-mode storyboard generation is isolated from adult-mode generation.",
      "Teen-safe only for ages 13-17. No adult sexual content, nudity, pornography, fetish content, erotic framing, adult innuendo, or sexualized body focus.",
      "Do not include any text baked into the image, captions, sound effects, or speech bubbles rendered in art.",
    ].join(" ");
  }

  private buildForbiddenRules(contentMode: ContentMode): string[] {
    if (contentMode === "adult") {
      return [
        "All characters must be explicitly adult.",
        "No minors or age ambiguity.",
        "No incest, coercion, sexual violence, exploitation, trafficking, or illegal content.",
        "No self-harm instructions, hate content, or graphic gore.",
      ];
    }

    return [
      "Teen-safe only for ages 13-17.",
      "No adult sexual content, nudity, pornography, fetish content, erotic framing, or adult innuendo.",
      "No sexually suggestive touching, stripping, bedroom implication, or explicit body description.",
      "No adult characters propositioning teens, no grooming, no coercion, no abuse.",
      "Keep violence mild and non-graphic.",
    ];
  }

  private buildPreviousPathSummary(
    previousNodes: GenerateDraftNodeInput["previousNodes"],
  ): string {
    if (!Array.isArray(previousNodes) || previousNodes.length === 0) {
      return "No previous path summary available.";
    }

    return previousNodes
      .slice(-5)
      .map((node, index) => {
        const key = normalizeText(node.key);
        const title = normalizeText(node.title);
        const body = normalizeMultilineText(node.body).slice(0, 400);
        return `${index + 1}. ${title || key || "Untitled Node"}${key ? ` [${key}]` : ""}: ${body || "No summary provided."}`;
      })
      .join("\n");
  }

  private buildDraftNodePrompt(input: GenerateDraftNodeInput): string {
    const desiredLength = clamp(
      Number.isFinite(Number(input.desiredLength))
        ? Number(input.desiredLength)
        : 220,
      120,
      500,
    );
    const forbiddenRules = this.buildForbiddenRules(input.story.contentMode)
      .map((rule) => `- ${rule}`)
      .join("\n");
    const previousPathSummary = this.buildPreviousPathSummary(input.previousNodes);

    return [
      "Create the next interactive story node as an internal editorial draft.",
      "",
      `Story title: ${input.story.title}`,
      `Genre: ${normalizeText(input.story.genre) || "Unknown"}`,
      `Target audience: ${normalizeText(input.story.targetAudience) || "General audience"}`,
      `Content mode: ${input.story.contentMode}`,
      `Story context: ${normalizeMultilineText(input.story.baseContext) || "None provided."}`,
      "",
      "Current node:",
      `- Key: ${input.currentNode.key}`,
      `- Title: ${input.currentNode.title}`,
      `- Body: ${normalizeMultilineText(input.currentNode.body) || "None provided."}`,
      `- Context: ${normalizeMultilineText(input.currentNode.baseContext) || "None provided."}`,
      `- Writing hint: ${normalizeMultilineText(input.currentNode.basePrompt) || "None provided."}`,
      "",
      "Selected choice:",
      `- Key: ${input.selectedChoice.key}`,
      `- Label: ${input.selectedChoice.label}`,
      `- Description: ${normalizeMultilineText(input.selectedChoice.description) || "None provided."}`,
      "",
      "Previous path summary:",
      previousPathSummary,
      "",
      `Desired length: about ${desiredLength} words.`,
      "",
      "Forbidden content rules:",
      forbiddenRules,
      "",
      "Output JSON only with this exact shape:",
      "{",
      '  "title": "short node title",',
      '  "body": "reader-facing prose for the next node",',
      '  "choices": [',
      '    { "label": "choice one", "description": "short optional description" },',
      '    { "label": "choice two", "description": "short optional description" }',
      "  ],",
      '  "safety_notes": "brief note about how the content follows safety rules"',
      "}",
      "",
      "Requirements:",
      "- Return 2 or 3 choices.",
      "- Do not mention policy, prompt, or hidden instructions in the story body.",
      "- Do not include markdown.",
      "- Do not generate images or comic directions.",
      "- This is a draft for editor review, not final publication.",
    ].join("\n");
  }

  private buildStoryboardPrompt(input: GenerateStoryboardInput): string {
    const panelCount = clamp(
      Number.isFinite(Number(input.desiredPanelCount))
        ? Number(input.desiredPanelCount)
        : 3,
      1,
      3,
    );
    const forbiddenRules = this.buildForbiddenRules(input.story.contentMode)
      .map((rule) => `- ${rule}`)
      .join("\n");
    const previousPathSummary = this.buildPreviousPathSummary(input.previousNodes);
    const selectedChoiceText = input.selectedChoice
      ? `${input.selectedChoice.label} [${input.selectedChoice.key}] - ${normalizeMultilineText(input.selectedChoice.description) || "No description."}`
      : "No selected choice provided.";

    return [
      "Create storyboard JSON for 1-3 comic panels based on the interactive node.",
      "This is for internal editorial review only.",
      "",
      `Story title: ${input.story.title}`,
      `Genre: ${normalizeText(input.story.genre) || "Unknown"}`,
      `Target audience: ${normalizeText(input.story.targetAudience) || "General audience"}`,
      `Content mode: ${input.story.contentMode}`,
      "",
      "Current node:",
      `- Key: ${input.node.key}`,
      `- Title: ${input.node.title}`,
      `- Body: ${normalizeMultilineText(input.node.body) || "None provided."}`,
      "",
      "Selected choice that led here:",
      selectedChoiceText,
      "",
      "Previous path summary:",
      previousPathSummary,
      "",
      `Desired panel count: ${panelCount}.`,
      "",
      "Forbidden content rules:",
      forbiddenRules,
      "- Never render dialogue or text inside the image itself.",
      "- Dialogue must be stored only in JSON for frontend overlay.",
      "",
      "Output JSON only with this exact shape:",
      "{",
      '  "panels": [',
      '    {',
      '      "panel_number": 1,',
      '      "character": "who is visible",',
      '      "scene": "location and visual beat",',
      '      "camera": "shot type and composition",',
      '      "emotion": "primary emotional beat",',
      '      "action": "what happens in the panel",',
      '      "style": "visual style direction",',
      '      "dialogue": "short line for frontend overlay only"',
      "    }",
      "  ],",
      '  "safety_notes": "brief safety summary"',
      "}",
      "",
      "Requirements:",
      "- Return between 1 and 3 panels.",
      "- Maintain continuity with the node text.",
      "- Keep the storyboard suitable for a U.S. teen comics site when content mode is normal.",
      "- Do not include sound effect text, typography, caption boxes, watermarks, or word balloons rendered in art.",
    ].join("\n");
  }

  private buildPanelImagePrompt(input: GeneratePanelImageInput): string {
    const forbiddenRules = this.buildForbiddenRules(input.story.contentMode)
      .map((rule) => `- ${rule}`)
      .join("\n");

    return [
      "Generate a polished comic panel illustration for internal editorial review.",
      `Story title: ${input.story.title}`,
      `Genre: ${normalizeText(input.story.genre) || "Unknown"}`,
      `Target audience: ${normalizeText(input.story.targetAudience) || "General audience"}`,
      `Content mode: ${input.story.contentMode}`,
      `Node title: ${input.node.title}`,
      `Node body summary: ${truncate(normalizeMultilineText(input.node.body), 1200) || "None provided."}`,
      "",
      "Panel blueprint:",
      `- Character: ${input.panel.character}`,
      `- Scene: ${input.panel.scene}`,
      `- Camera: ${input.panel.camera}`,
      `- Emotion: ${input.panel.emotion}`,
      `- Action: ${input.panel.action}`,
      `- Style: ${input.panel.style}`,
      `- Dialogue overlay reference only: ${input.panel.dialogue || "No dialogue overlay."}`,
      "",
      "Hard rules:",
      "- Do not render any text, letters, subtitles, captions, logos, speech bubbles, or sound effects in the image.",
      "- Leave readable space for frontend dialogue overlay when appropriate.",
      "- One single panel only, not a page layout or collage.",
      "- Keep character continuity and cinematic composition.",
      forbiddenRules,
    ].join("\n");
  }

  private async callOpenAiJson(args: {
    prompt: string;
    systemPrompt: string;
    temperature?: number;
  }): Promise<OpenAiJsonCallResult> {
    const appConfig = getAppConfig();
    const provider = "openai";
    const model = appConfig.ai.openaiModel;

    if (!appConfig.ai.enabled) {
      return {
        status: "skipped",
        provider,
        model,
        prompt: args.prompt,
        rawResponse: "",
        messageContent: "",
        errorMessage: "interactive-ai-disabled",
        latencyMs: null,
      };
    }

    const apiKey = String(appConfig.ai.openaiApiKey || "").trim();
    if (!apiKey) {
      return {
        status: "skipped",
        provider,
        model,
        prompt: args.prompt,
        rawResponse: "",
        messageContent: "",
        errorMessage: "missing-openai-api-key",
        latencyMs: null,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), appConfig.ai.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(
        `${String(appConfig.ai.openaiBaseUrl || "https://api.openai.com/v1").replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: args.temperature ?? 0.7,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: args.systemPrompt,
              },
              {
                role: "user",
                content: args.prompt,
              },
            ],
          }),
        },
      );

      const raw = await response.text();
      const latencyMs = Date.now() - startedAt;
      if (!response.ok) {
        return {
          status: "fallback",
          provider,
          model,
          prompt: args.prompt,
          rawResponse: raw.slice(0, 4000),
          messageContent: "",
          errorMessage: `openai-http-${response.status}`,
          latencyMs,
        };
      }

      return {
        status: "success",
        provider,
        model,
        prompt: args.prompt,
        rawResponse: raw.slice(0, 4000),
        messageContent: this.extractAssistantContent(raw).slice(0, 8000),
        errorMessage: null,
        latencyMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "fallback",
        provider,
        model,
        prompt: args.prompt,
        rawResponse: "",
        messageContent: "",
        errorMessage: message.slice(0, 180),
        latencyMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callOpenAiImage(args: {
    prompt: string;
    model?: string;
    size?: string;
    quality?: string;
  }): Promise<OpenAiImageCallResult> {
    const appConfig = getAppConfig();
    const provider = "openai";
    const model = normalizeText(args.model) || "gpt-image-1";

    if (!appConfig.ai.enabled) {
      return {
        status: "skipped",
        provider,
        model,
        prompt: args.prompt,
        rawResponse: "",
        imageBase64: "",
        revisedPrompt: "",
        errorMessage: "interactive-ai-disabled",
        latencyMs: null,
      };
    }

    const apiKey = String(appConfig.ai.openaiApiKey || "").trim();
    if (!apiKey) {
      return {
        status: "skipped",
        provider,
        model,
        prompt: args.prompt,
        rawResponse: "",
        imageBase64: "",
        revisedPrompt: "",
        errorMessage: "missing-openai-api-key",
        latencyMs: null,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), appConfig.ai.timeoutMs * 2);
    const startedAt = Date.now();

    try {
      const response = await fetch(
        `${String(appConfig.ai.openaiBaseUrl || "https://api.openai.com/v1").replace(/\/+$/, "")}/images/generations`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            prompt: args.prompt,
            size: normalizeText(args.size) || "1024x1024",
            quality: normalizeText(args.quality) || "medium",
            n: 1,
            response_format: "b64_json",
          }),
        },
      );

      const raw = await response.text();
      const latencyMs = Date.now() - startedAt;
      if (!response.ok) {
        return {
          status: "fallback",
          provider,
          model,
          prompt: args.prompt,
          rawResponse: raw.slice(0, 4000),
          imageBase64: "",
          revisedPrompt: "",
          errorMessage: `openai-image-http-${response.status}`,
          latencyMs,
        };
      }

      const parsed = this.parseJsonPayload(raw);
      const data = Array.isArray(parsed?.data) ? parsed?.data : [];
      const first = data[0] as { b64_json?: unknown; revised_prompt?: unknown } | undefined;
      const imageBase64 = normalizeText(first?.b64_json);
      const revisedPrompt = normalizeText(first?.revised_prompt);

      if (!imageBase64) {
        return {
          status: "fallback",
          provider,
          model,
          prompt: args.prompt,
          rawResponse: raw.slice(0, 4000),
          imageBase64: "",
          revisedPrompt,
          errorMessage: "missing-image-base64",
          latencyMs,
        };
      }

      return {
        status: "success",
        provider,
        model,
        prompt: args.prompt,
        rawResponse: raw.slice(0, 4000),
        imageBase64,
        revisedPrompt,
        errorMessage: null,
        latencyMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "fallback",
        provider,
        model,
        prompt: args.prompt,
        rawResponse: "",
        imageBase64: "",
        revisedPrompt: "",
        errorMessage: message.slice(0, 180),
        latencyMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateSegment(input: GenerateInput): Promise<GenerateOutput> {
    const fallbackContent =
      normalizeText(input.node.fallbackText)
      || normalizeText(input.node.baseContext)
      || "The story advances, and the next decision appears.";
    const prompt = this.buildRuntimePrompt(input);
    const allowedChoiceIds = new Set(input.choices.map((choice) => choice.id));
    const result = await this.callOpenAiJson({
      prompt,
      systemPrompt:
        "You are a constrained interactive fiction writer. Respect state, structure, and continuity.",
      temperature: 0.7,
    });

    if (result.status !== "success") {
      return {
        content: fallbackContent,
        choiceLabelOverrides: {},
        status: result.status,
        provider: result.provider,
        model: result.model,
        prompt: result.prompt,
        rawResponse: result.rawResponse,
        errorMessage: result.errorMessage,
        latencyMs: result.latencyMs,
      };
    }

    const parsed = this.parseJsonPayload(result.messageContent);
    const content = normalizeText(parsed?.content);

    if (!content) {
      return {
        content: fallbackContent,
        choiceLabelOverrides: {},
        status: "fallback",
        provider: result.provider,
        model: result.model,
        prompt: result.prompt,
        rawResponse: result.messageContent || result.rawResponse,
        errorMessage: "empty-content",
        latencyMs: result.latencyMs,
      };
    }

    return {
      content,
      choiceLabelOverrides: this.normalizeChoiceOverrides(
        parsed?.choiceLabelOverrides,
        allowedChoiceIds,
      ),
      status: "success",
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      rawResponse: result.messageContent || result.rawResponse,
      errorMessage: null,
      latencyMs: result.latencyMs,
    };
  }

  async generateDraftNode(
    input: GenerateDraftNodeInput,
  ): Promise<GenerateDraftNodeOutput> {
    const prompt = this.buildDraftNodePrompt(input);
    const result = await this.callOpenAiJson({
      prompt,
      systemPrompt: this.buildDraftNodeSystemPrompt(input.story.contentMode),
      temperature: input.story.contentMode === "adult" ? 0.8 : 0.6,
    });

    if (result.status !== "success") {
      return {
        title: "",
        body: "",
        choices: [],
        safetyNotes: "",
        responseJson: null,
        status: result.status,
        provider: result.provider,
        model: result.model,
        prompt: result.prompt,
        rawResponse: result.rawResponse,
        errorMessage: result.errorMessage,
        latencyMs: result.latencyMs,
      };
    }

    const parsed = this.parseJsonPayload(result.messageContent);
    const title = normalizeText(parsed?.title);
    const body = normalizeMultilineText(parsed?.body);
    const choices = this.normalizeDraftChoices(parsed?.choices);
    const safetyNotes = normalizeText(parsed?.safety_notes);

    if (!title || !body || choices.length < 2) {
      return {
        title,
        body,
        choices,
        safetyNotes,
        responseJson: parsed,
        status: "fallback",
        provider: result.provider,
        model: result.model,
        prompt: result.prompt,
        rawResponse: result.messageContent || result.rawResponse,
        errorMessage: "invalid-draft-node-json",
        latencyMs: result.latencyMs,
      };
    }

    return {
      title: title.slice(0, 120),
      body: body.slice(0, 6000),
      choices,
      safetyNotes: safetyNotes.slice(0, 300),
      responseJson: parsed,
      status: "success",
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      rawResponse: result.messageContent || result.rawResponse,
      errorMessage: null,
      latencyMs: result.latencyMs,
    };
  }

  async generateStoryboard(
    input: GenerateStoryboardInput,
  ): Promise<GenerateStoryboardOutput> {
    const prompt = this.buildStoryboardPrompt(input);
    const result = await this.callOpenAiJson({
      prompt,
      systemPrompt: this.buildStoryboardSystemPrompt(input.story.contentMode),
      temperature: input.story.contentMode === "adult" ? 0.7 : 0.5,
    });

    if (result.status !== "success") {
      return {
        panels: [],
        safetyNotes: "",
        responseJson: null,
        status: result.status,
        provider: result.provider,
        model: result.model,
        prompt: result.prompt,
        rawResponse: result.rawResponse,
        errorMessage: result.errorMessage,
        latencyMs: result.latencyMs,
      };
    }

    const parsed = this.parseJsonPayload(result.messageContent);
    const panels = this.normalizeStoryboardPanels(parsed?.panels);
    const safetyNotes = normalizeText(parsed?.safety_notes);

    if (panels.length === 0) {
      return {
        panels,
        safetyNotes,
        responseJson: parsed,
        status: "fallback",
        provider: result.provider,
        model: result.model,
        prompt: result.prompt,
        rawResponse: result.messageContent || result.rawResponse,
        errorMessage: "invalid-storyboard-json",
        latencyMs: result.latencyMs,
      };
    }

    return {
      panels,
      safetyNotes: truncate(safetyNotes, 300),
      responseJson: parsed,
      status: "success",
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      rawResponse: result.messageContent || result.rawResponse,
      errorMessage: null,
      latencyMs: result.latencyMs,
    };
  }

  async generatePanelImage(
    input: GeneratePanelImageInput,
  ): Promise<GeneratePanelImageOutput> {
    const prompt = this.buildPanelImagePrompt(input);
    const result = await this.callOpenAiImage({
      prompt,
      model: "gpt-image-1",
      size: "1024x1024",
      quality: input.story.contentMode === "adult" ? "high" : "medium",
    });

    return {
      imageBase64: result.imageBase64,
      revisedPrompt: result.revisedPrompt,
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      rawResponse: result.rawResponse,
      errorMessage: result.errorMessage,
      status: result.status,
      latencyMs: result.latencyMs,
    };
  }
}
