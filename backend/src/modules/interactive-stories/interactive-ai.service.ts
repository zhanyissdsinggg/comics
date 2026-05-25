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

type SafetyClassifierResult = {
  ok: boolean;
  safe: boolean;
  reason: string;
  notes: string;
};

const NORMAL_FORBIDDEN_REGEX =
  /\b(explicit|porn|erotic|smut|sexual|nsfw|nude|fetish|orgasm|seduce|seduction|bedroom|graphic violence|gore|minor)\b/i;
const GENERIC_FORBIDDEN_REGEX =
  /\b(sexualized minors|child porn|rape|incest|bestiality)\b/i;

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
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

function getSafetyRules(contentMode: "NORMAL" | "ADULT") {
  if (contentMode === "NORMAL") {
    return [
      "Target audience is US teens.",
      "Teen-safe only.",
      "Do not include explicit sexual content.",
      "Do not include sexualized minors.",
      "Do not include adult framing or adult innuendo.",
      "Do not include graphic violence or gore.",
    ];
  }

  return [
    "Maintain internal continuity.",
    "Do not include sexualized minors.",
    "Do not include illegal exploitation.",
    "Do not include disallowed extreme graphic violence.",
  ];
}

@Injectable()
export class InteractiveAiService {
  private buildPrompt(input: GenerateDraftNodeInput): string {
    const previousPathSummary = input.previousNodes
      .slice(-5)
      .map((node, index) => `${index + 1}. ${node.title}: ${truncateText(node.body, 240)}`)
      .join("\n");
    const safetyRules = getSafetyRules(input.story.contentMode);

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

  private buildClassifierPrompt(
    input: GenerateDraftNodeInput,
    draft: NonNullable<GenerateDraftNodeOutput["draft"]>,
  ) {
    return [
      "You are a strict safety classifier for interactive fiction drafts.",
      "Return JSON only.",
      `Content mode: ${input.story.contentMode}`,
      `Target audience: ${input.story.targetAudience}`,
      `Safety rules: ${getSafetyRules(input.story.contentMode).join(" | ")}`,
      `Draft title: ${draft.title}`,
      `Draft body: ${draft.body}`,
      `Draft choices: ${draft.choices.map((choice) => `${choice.label} :: ${choice.description}`).join(" || ")}`,
      "Classify whether the draft is safe for this content mode and audience.",
      'Return {"safe": true|false, "reason": "short-code", "notes": "short explanation"}',
    ].join("\n");
  }

  private validateDraftShape(
    input: GenerateDraftNodeInput,
    parsed: Record<string, unknown> | null,
  ): { ok: boolean; draft: GenerateDraftNodeOutput["draft"]; error: string | null } {
    if (!parsed) {
      return { ok: false, draft: null, error: "invalid-json" };
    }

    const payload = parsed as ParsedPayload;
    const title = truncateText(normalizeText(payload.title), 120);
    const body = truncateText(normalizeText(payload.body), 4000);
    const choices = normalizeChoices(payload.choices).slice(0, 3);
    const safetyNotes = truncateText(normalizeText(payload.safety_notes), 400);

    if (!title || !body) {
      return { ok: false, draft: null, error: "missing-title-or-body" };
    }
    if (body.length < 120) {
      return { ok: false, draft: null, error: "body-too-short" };
    }
    if (choices.length < 2 || choices.length > 3) {
      return { ok: false, draft: null, error: "invalid-choice-count" };
    }

    const combined = `${title}\n${body}\n${choices
      .map((item) => `${item.label} ${item.description}`)
      .join("\n")}\n${safetyNotes}`;
    if (GENERIC_FORBIDDEN_REGEX.test(combined)) {
      return { ok: false, draft: null, error: "generic-safety-rejected" };
    }
    if (input.story.contentMode === "NORMAL" && NORMAL_FORBIDDEN_REGEX.test(combined)) {
      return { ok: false, draft: null, error: "normal-mode-safety-rejected" };
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

  private async callOpenAiJson(params: {
    prompt: string;
    system: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    timeoutMs: number;
  }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
    const startedAt = Date.now();
    try {
      const response = await fetch(
        `${params.baseUrl.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${params.apiKey}`,
          },
          body: JSON.stringify({
            model: params.model,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: params.system,
              },
              {
                role: "user",
                content: params.prompt,
              },
            ],
          }),
        },
      );

      const raw = await response.text();
      const latencyMs = Date.now() - startedAt;
      if (!response.ok) {
        return {
          ok: false as const,
          raw,
          latencyMs,
          error: `openai-http-${response.status}`,
        };
      }

      const parsedOuter = parseJsonObject(raw);
      const messageContent = String(
        parsedOuter?.choices && Array.isArray(parsedOuter.choices)
          ? (parsedOuter.choices[0] as { message?: { content?: unknown } })?.message?.content || ""
          : "",
      );

      return {
        ok: true as const,
        raw: messageContent || raw,
        latencyMs,
        error: null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false as const,
        raw: "",
        latencyMs: Date.now() - startedAt,
        error: message.slice(0, 180),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async classifyDraftSafety(params: {
    input: GenerateDraftNodeInput;
    draft: NonNullable<GenerateDraftNodeOutput["draft"]>;
    apiKey: string;
    baseUrl: string;
    model: string;
    timeoutMs: number;
  }): Promise<SafetyClassifierResult> {
    const prompt = this.buildClassifierPrompt(params.input, params.draft);
    const response = await this.callOpenAiJson({
      prompt,
      system:
        "You are a strict JSON safety classifier. Be conservative. If content may violate rules, mark unsafe.",
      model: params.model,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      timeoutMs: Math.min(params.timeoutMs, 8000),
    });

    if (!response.ok) {
      return {
        ok: false,
        safe: false,
        reason: response.error || "classifier-failed",
        notes: "Classifier request failed.",
      };
    }

    const parsed = parseJsonObject(response.raw);
    const safe = parsed?.safe === true;
    const reason = truncateText(normalizeText(parsed?.reason), 120) || "classifier-rejected";
    const notes = truncateText(normalizeText(parsed?.notes), 240) || "Classifier rejected the draft.";
    return {
      ok: true,
      safe,
      reason,
      notes,
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

    const draftResponse = await this.callOpenAiJson({
      prompt,
      system:
        "You are an interactive fiction drafting assistant. Follow content-mode safety rules exactly and output strict JSON.",
      model,
      apiKey,
      baseUrl: appConfig.ai.openaiBaseUrl,
      timeoutMs: appConfig.ai.timeoutMs,
    });

    if (!draftResponse.ok) {
      return {
        ok: false,
        status: "fallback",
        provider,
        model,
        prompt,
        rawResponse: draftResponse.raw.slice(0, 4000),
        errorMessage: draftResponse.error,
        latencyMs: draftResponse.latencyMs,
        draft: null,
      };
    }

    const validated = this.validateDraftShape(input, parseJsonObject(draftResponse.raw));
    if (!validated.ok || !validated.draft) {
      return {
        ok: false,
        status: "rejected",
        provider,
        model,
        prompt,
        rawResponse: draftResponse.raw.slice(0, 4000),
        errorMessage: validated.error,
        latencyMs: draftResponse.latencyMs,
        draft: null,
      };
    }

    const classifier = await this.classifyDraftSafety({
      input,
      draft: validated.draft,
      apiKey,
      baseUrl: appConfig.ai.openaiBaseUrl,
      model,
      timeoutMs: appConfig.ai.timeoutMs,
    });

    if (!classifier.ok || !classifier.safe) {
      return {
        ok: false,
        status: "rejected",
        provider,
        model,
        prompt,
        rawResponse: draftResponse.raw.slice(0, 4000),
        errorMessage: classifier.reason,
        latencyMs: draftResponse.latencyMs,
        draft: {
          ...validated.draft,
          safetyNotes: truncateText(
            normalizeText(`${validated.draft.safetyNotes} ${classifier.notes}`),
            400,
          ),
        },
      };
    }

    return {
      ok: true,
      status: "success",
      provider,
      model,
      prompt,
      rawResponse: draftResponse.raw.slice(0, 4000),
      errorMessage: null,
      latencyMs: draftResponse.latencyMs,
      draft: {
        ...validated.draft,
        safetyNotes: truncateText(
          normalizeText(`${validated.draft.safetyNotes} ${classifier.notes}`),
          400,
        ),
      },
    };
  }
}
