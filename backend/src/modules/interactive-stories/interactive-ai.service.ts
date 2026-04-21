import { Injectable } from "@nestjs/common";
import { getAppConfig } from "../../common/config/app-config";

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

type ParsedAiPayload = {
  content?: unknown;
  choiceLabelOverrides?: unknown;
  choices?: unknown;
};

@Injectable()
export class InteractiveAiService {
  private buildPrompt(input: GenerateInput): string {
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
      '{',
      '  "content": "2-4 sentences, concise and vivid. Keep it under 120 words.",',
      '  "choiceLabelOverrides": {',
      '    "<choice-id>": "optional rewritten label, keep meaning unchanged"',
      "  }",
      "}",
    ].join("\n");
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
      const text = String(raw || "").replace(/\s+/g, " ").trim();
      if (!text) {
        continue;
      }
      result[key] = text.slice(0, 80);
    }
    return result;
  }

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

  async generateSegment(input: GenerateInput): Promise<GenerateOutput> {
    const appConfig = getAppConfig();
    const fallbackContent =
      String(input.node.fallbackText || "").trim() ||
      String(input.node.baseContext || "").trim() ||
      "The story advances, and the next decision appears.";
    const prompt = this.buildPrompt(input);
    const provider = "openai";
    const model = appConfig.ai.openaiModel;
    const allowedChoiceIds = new Set(input.choices.map((choice) => choice.id));

    if (!appConfig.ai.enabled) {
      return {
        content: fallbackContent,
        choiceLabelOverrides: {},
        status: "skipped",
        provider,
        model,
        prompt,
        rawResponse: "",
        errorMessage: "interactive-ai-disabled",
        latencyMs: null,
      };
    }

    const apiKey = String(appConfig.ai.openaiApiKey || "").trim();
    if (!apiKey) {
      return {
        content: fallbackContent,
        choiceLabelOverrides: {},
        status: "skipped",
        provider,
        model,
        prompt,
        rawResponse: "",
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
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are a constrained interactive fiction writer. Respect state, structure, and continuity.",
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
          content: fallbackContent,
          choiceLabelOverrides: {},
          status: "fallback",
          provider,
          model,
          prompt,
          rawResponse: raw.slice(0, 2000),
          errorMessage: `openai-http-${response.status}`,
          latencyMs,
        };
      }

      const parsedOuter = this.parseJsonPayload(raw);
      const messageContent = String(
        parsedOuter?.choices && Array.isArray(parsedOuter.choices)
          ? (parsedOuter.choices[0] as { message?: { content?: unknown } })?.message?.content || ""
          : "",
      );
      const parsed = this.parseJsonPayload(messageContent);
      const content = String(parsed?.content || "")
        .replace(/\s+/g, " ")
        .trim();

      if (!content) {
        return {
          content: fallbackContent,
          choiceLabelOverrides: {},
          status: "fallback",
          provider,
          model,
          prompt,
          rawResponse: messageContent.slice(0, 2000) || raw.slice(0, 2000),
          errorMessage: "empty-content",
          latencyMs,
        };
      }

      return {
        content,
        choiceLabelOverrides: this.normalizeChoiceOverrides(
          parsed?.choiceLabelOverrides,
          allowedChoiceIds,
        ),
        status: "success",
        provider,
        model,
        prompt,
        rawResponse: messageContent.slice(0, 2000),
        errorMessage: null,
        latencyMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: fallbackContent,
        choiceLabelOverrides: {},
        status: "fallback",
        provider,
        model,
        prompt,
        rawResponse: "",
        errorMessage: message.slice(0, 180),
        latencyMs: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
