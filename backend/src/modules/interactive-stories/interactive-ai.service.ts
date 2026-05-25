import { Injectable } from "@nestjs/common";
import { getAppConfig } from "../../common/config/app-config";

type DraftChoice = {
  label: string;
  description: string;
};

export type GenerateDraftNodeInput = {
  story: {
    id: string;
    title: string;
    genre: string[];
    targetAudience: string;
    contentMode: "NORMAL" | "ADULT";
    baseContext: string;
  };
  currentNode: {
    id: string;
    title: string;
    body: string;
    aiEnabled: boolean;
  };
  selectedChoice: {
    id: string;
    label: string;
    description: string;
  };
  previousNodes: Array<{
    title: string;
    body: string;
  }>;
  desiredLength: number;
};

export type GenerateDraftNodeOutput = {
  ok: boolean;
  status: "success" | "rejected" | "fallback";
  provider: string;
  model: string;
  prompt: string;
  rawResponse: string;
  errorMessage: string | null;
  latencyMs: number | null;
  draft: {
    title: string;
    body: string;
    choices: DraftChoice[];
    safetyNotes: string;
  } | null;
};

type ParsedPayload = {
  title?: unknown;
  body?: unknown;
  choices?: unknown;
  safety_notes?: unknown;
};

const NORMAL_FORBIDDEN_REGEX =
  /\b(explicit|porn|erotic|smut|sexual|nsfw|nude|fetish|orgasm|seduce|seduction|bedroom|graphic violence|gore|minor)\b/i;

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function parseJsonObject(raw: string): ParsedPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as ParsedPayload;
  } catch {
    return null;
  }
}

function normalizeChoices(value: unknown): DraftChoice[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => ({
      label: truncateText(normalizeText((item as { label?: unknown })?.label), 80),
      description: truncateText(
        normalizeText((item as { description?: unknown })?.description),
        160,
      ),
    }))
    .filter((item) => item.label);
}

@Injectable()
export class InteractiveAiService {
  private buildPrompt(input: GenerateDraftNodeInput): string {
    const previousPathSummary = input.previousNodes
      .slice(-5)
      .map((node, index) => `${index + 1}. ${node.title}: ${truncateText(node.body, 240)}`)
      .join("\n");

    const safetyRules =
      input.story.contentMode === "NORMAL"
        ? [
            "Target audience is US teens.",
            "Teen-safe only.",
            "Do not include explicit sexual content.",
            "Do not include sexualized minors.",
            "Do not include adult framing or adult innuendo.",
            "Do not include graphic violence or gore.",
          ]
        : [
            "Maintain internal continuity.",
            "Do not include sexualized minors.",
            "Do not include illegal exploitation.",
            "Do not include disallowed extreme graphic violence.",
          ];

    return [
      "You generate the next branching draft node for an interactive fiction editor.",
      "This is admin-only draft assistance. Do not publish language. Do not mention review workflow.",
      "",
      `Story title: ${input.story.title}`,
      `Genre: ${input.story.genre.join(", ") || "Unknown"}`,
      `Target audience: ${input.story.targetAudience}`,
      `Content mode: ${input.story.contentMode}`,
      `Story context: ${input.story.baseContext}`,
      `Current node title: ${input.currentNode.title}`,
      `Current node body: ${input.currentNode.body}`,
      `Selected choice: ${input.selectedChoice.label}`,
      `Selected choice description: ${input.selectedChoice.description}`,
      `Previous path summary:\n${previousPathSummary || "No previous nodes supplied."}`,
      `Desired length: around ${Math.max(120, input.desiredLength)} words`,
      `Safety rules:\n- ${safetyRules.join("\n- ")}`,
      "",
      "Output valid JSON only with this exact shape:",
      "{",
      '  "title": "string",',
      '  "body": "string",',
      '  "choices": [',
      '    { "label": "string", "description": "string" }',
      "  ],",
      '  "safety_notes": "string"',
      "}",
    ].join("\n");
  }

  private validateDraft(
    input: GenerateDraftNodeInput,
    parsed: ParsedPayload | null,
  ): { ok: boolean; draft: GenerateDraftNodeOutput["draft"]; error: string | null } {
    if (!parsed) {
      return { ok: false, draft: null, error: "invalid-json" };
    }

    const title = truncateText(normalizeText(parsed.title), 120);
    const body = truncateText(normalizeText(parsed.body), 4000);
    const choices = normalizeChoices(parsed.choices).slice(0, 3);
    const safetyNotes = truncateText(normalizeText(parsed.safety_notes), 400);

    if (!title || !body) {
      return { ok: false, draft: null, error: "missing-title-or-body" };
    }

    if (choices.length < 2 || choices.length > 3) {
      return { ok: false, draft: null, error: "invalid-choice-count" };
    }

    if (input.story.contentMode === "NORMAL") {
      const combined = `${title}\n${body}\n${choices
        .map((item) => `${item.label} ${item.description}`)
        .join("\n")}\n${safetyNotes}`;
      if (NORMAL_FORBIDDEN_REGEX.test(combined)) {
        return { ok: false, draft: null, error: "normal-mode-safety-rejected" };
      }
    }

    return {
      ok: true,
      error: null,
      draft: {
        title,
        body,
        choices,
        safetyNotes,
      },
    };
  }

  async generateDraftNode(
    input: GenerateDraftNodeInput,
  ): Promise<GenerateDraftNodeOutput> {
    const appConfig = getAppConfig();
    const provider = "openai";
    const model = appConfig.ai.openaiModel;
    const prompt = this.buildPrompt(input);

    if (!appConfig.ai.enabled) {
      return {
        ok: false,
        status: "fallback",
        provider,
        model,
        prompt,
        rawResponse: "",
        errorMessage: "interactive-ai-disabled",
        latencyMs: null,
        draft: null,
      };
    }

    const apiKey = String(appConfig.ai.openaiApiKey || "").trim();
    if (!apiKey) {
      return {
        ok: false,
        status: "fallback",
        provider,
        model,
        prompt,
        rawResponse: "",
        errorMessage: "missing-openai-api-key",
        latencyMs: null,
        draft: null,
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
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are an interactive fiction drafting assistant. Follow content-mode safety rules exactly and output strict JSON.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        },
      );

      const raw = await response.text();
      const latencyMs = Date.now() - startedAt;
      if (!response.ok) {
        return {
          ok: false,
          status: "fallback",
          provider,
          model,
          prompt,
          rawResponse: raw.slice(0, 4000),
          errorMessage: `openai-http-${response.status}`,
          latencyMs,
          draft: null,
        };
      }

      const parsedOuter = parseJsonObject(raw);
      const messageContent = String(
        parsedOuter?.choices && Array.isArray(parsedOuter.choices)
          ? (parsedOuter.choices[0] as { message?: { content?: unknown } })?.message?.content || ""
          : "",
      );
      const validated = this.validateDraft(input, parseJsonObject(messageContent));
      if (!validated.ok) {
        return {
          ok: false,
          status: "rejected",
          provider,
          model,
          prompt,
          rawResponse: messageContent.slice(0, 4000) || raw.slice(0, 4000),
          errorMessage: validated.error,
          latencyMs,
          draft: null,
        };
      }

      return {
        ok: true,
        status: "success",
        provider,
        model,
        prompt,
        rawResponse: messageContent.slice(0, 4000),
        errorMessage: null,
        latencyMs,
        draft: validated.draft,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        status: "fallback",
        provider,
        model,
        prompt,
        rawResponse: "",
        errorMessage: message.slice(0, 180),
        latencyMs: Date.now() - startedAt,
        draft: null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
