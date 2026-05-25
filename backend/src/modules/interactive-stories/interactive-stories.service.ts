import { Injectable } from "@nestjs/common";
import type {
  InteractiveStory,
  InteractiveStoryChoice,
  InteractiveStoryNode,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

type StoryState = Record<string, unknown>;

type StoryWithGraph = InteractiveStory & {
  series: {
    id: string;
    title: string;
    adult: boolean;
  } | null;
  nodes: Array<
    InteractiveStoryNode & {
      choices: InteractiveStoryChoice[];
    }
  >;
};

type ContentMode = "NORMAL" | "ADULT";

type StoryChoiceView = {
  id: string;
  key: string;
  label: string;
  description: string;
  requiresPremium: boolean;
  requiresTokens: number;
  unlockLabel: string | null;
  locked: boolean;
  lockedReason: string | null;
};

type StoryNodeView = {
  id: string;
  key: string;
  title: string;
  content: string;
  isEnding: boolean;
  choices: StoryChoiceView[];
};

export type StorySummaryView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  seriesId: string | null;
  coverImage: string | null;
  contentMode: ContentMode;
};

export type StoryProgressView = {
  story: {
    id: string;
    seriesId: string | null;
    slug: string;
    title: string;
    description: string;
    contentMode: ContentMode;
  };
  state: StoryState;
  flags: string[];
  node: StoryNodeView;
};

export type StoryAccessContext = {
  includeAdult: boolean;
};

export type SubmitChoiceInput = {
  storySlug: string;
  userId: string;
  choiceId: string;
  idempotencyKey?: string | null;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function normalizeContentMode(value: unknown): ContentMode {
  return String(value || "").trim().toUpperCase() === "ADULT"
    ? "ADULT"
    : "NORMAL";
}

function parseState(value: Prisma.JsonValue | null | undefined): StoryState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function toInputJson(value: StoryState): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function mergeFlags(
  state: StoryState,
  persistedFlags: string[],
  extraFlags: string[] = [],
): string[] {
  const stateFlags = parseStringArray(state.flags);
  const merged = new Set([
    ...persistedFlags.map((item) => normalizeText(item)),
    ...stateFlags,
    ...extraFlags.map((item) => normalizeText(item)),
  ]);
  return [...merged].filter(Boolean);
}

function applyEffects(
  baseState: StoryState,
  effectsJson: Prisma.JsonValue | null | undefined,
): StoryState {
  const nextState: StoryState = { ...baseState };
  if (!effectsJson || typeof effectsJson !== "object" || Array.isArray(effectsJson)) {
    return nextState;
  }

  const effects = effectsJson as Record<string, unknown>;
  for (const [key, rawValue] of Object.entries(effects)) {
    if (key === "flags") {
      nextState.flags = mergeFlags(
        nextState,
        parseStringArray(nextState.flags),
        parseStringArray(rawValue),
      );
      continue;
    }

    if (typeof rawValue === "number") {
      const current = Number(nextState[key] || 0);
      nextState[key] = current + rawValue;
      continue;
    }

    nextState[key] = rawValue;
  }

  nextState.flags = mergeFlags(nextState, parseStringArray(nextState.flags));
  return nextState;
}

@Injectable()
export class InteractiveStoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildStoryFilter(access: StoryAccessContext): Prisma.InteractiveStoryWhereInput {
    return {
      isPublished: true,
      contentMode: access.includeAdult ? "ADULT" : "NORMAL",
    };
  }

  private async findStoryGraphBySlug(
    slug: string,
    access: StoryAccessContext,
  ): Promise<StoryWithGraph | null> {
    return this.prisma.interactiveStory.findFirst({
      where: {
        slug,
        ...this.buildStoryFilter(access),
      },
      include: {
        series: {
          select: {
            id: true,
            title: true,
            adult: true,
          },
        },
        nodes: {
          orderBy: { sortOrder: "asc" },
          include: {
            choices: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }) as Promise<StoryWithGraph | null>;
  }

  private buildNodeByIdMap(story: StoryWithGraph) {
    const map = new Map<string, StoryWithGraph["nodes"][number]>();
    for (const node of story.nodes) {
      map.set(node.id, node);
    }
    return map;
  }

  private getStartNode(story: StoryWithGraph) {
    if (story.initialNodeId) {
      const found = story.nodes.find((node) => node.id === story.initialNodeId);
      if (found) {
        return found;
      }
    }
    return story.nodes[0] || null;
  }

  private isChoiceAvailable(choice: InteractiveStoryChoice, flags: string[]): boolean {
    const currentFlags = new Set(flags.map((item) => normalizeText(item)));
    const required = parseStringArray(choice.requiredFlags);
    const blocked = parseStringArray(choice.blockedFlags);
    const hasAllRequired = required.every((flag) => currentFlags.has(flag));
    if (!hasAllRequired) {
      return false;
    }
    return !blocked.some((flag) => currentFlags.has(flag));
  }

  private getLockedReason(choice: InteractiveStoryChoice): string | null {
    if (choice.requiresPremium) {
      return "PREMIUM_REQUIRED";
    }
    if (Number(choice.requiresTokens || 0) > 0) {
      return "TOKENS_REQUIRED";
    }
    return null;
  }

  private toChoiceView(
    choices: InteractiveStoryChoice[],
    flags: string[],
  ): StoryChoiceView[] {
    return choices
      .filter((choice) => this.isChoiceAvailable(choice, flags))
      .slice(0, 4)
      .map((choice) => {
        const lockedReason = this.getLockedReason(choice);
        return {
          id: choice.id,
          key: choice.choiceKey,
          label: normalizeText(choice.label),
          description: normalizeText(choice.description),
          requiresPremium: Boolean(choice.requiresPremium),
          requiresTokens: Math.max(0, Number(choice.requiresTokens || 0)),
          unlockLabel: normalizeNullableText(choice.unlockLabel),
          locked: Boolean(lockedReason),
          lockedReason,
        };
      });
  }

  private toNodeContent(node: InteractiveStoryNode, generatedText: string | null): string {
    const approved = normalizeText(generatedText);
    if (approved) {
      return approved;
    }
    const fallback = normalizeText(node.fallbackText);
    if (fallback) {
      return fallback;
    }
    const base = normalizeText(node.baseContext);
    if (base) {
      return base;
    }
    return "The story continues.";
  }

  private toProgressView(
    story: StoryWithGraph,
    node: StoryWithGraph["nodes"][number],
    state: StoryState,
    flags: string[],
    generatedText: string | null,
  ): StoryProgressView {
    return {
      story: {
        id: story.id,
        seriesId: story.seriesId,
        slug: story.slug,
        title: story.title,
        description: normalizeText(story.description),
        contentMode: normalizeContentMode(story.contentMode),
      },
      state,
      flags,
      node: {
        id: node.id,
        key: node.nodeKey,
        title: node.title,
        content: this.toNodeContent(node, generatedText),
        isEnding: Boolean(node.isEnding),
        choices: this.toChoiceView(node.choices, flags),
      },
    };
  }

  private ensureSeriesCompatibility(story: StoryWithGraph | null): StoryWithGraph | null {
    if (!story) {
      return null;
    }
    const contentMode = normalizeContentMode(story.contentMode);
    if (contentMode === "NORMAL" && story.series?.adult) {
      return null;
    }
    return story;
  }

  async listStories(access: StoryAccessContext): Promise<StorySummaryView[]> {
    const stories = await this.prisma.interactiveStory.findMany({
      where: this.buildStoryFilter(access),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        seriesId: true,
        contentMode: true,
        series: {
          select: {
            id: true,
            adult: true,
            coverUrl: true,
          },
        },
      },
    });

    return stories
      .filter((story) => !(normalizeContentMode(story.contentMode) === "NORMAL" && story.series?.adult))
      .map((story) => ({
        id: story.id,
        slug: story.slug,
        title: story.title,
        description: normalizeText(story.description),
        seriesId: story.seriesId,
        coverImage: normalizeNullableText(story.series?.coverUrl),
        contentMode: normalizeContentMode(story.contentMode),
      }));
  }

  async getStoryBySeries(seriesId: string, access: StoryAccessContext) {
    const normalizedSeriesId = normalizeText(seriesId);
    if (!normalizedSeriesId) {
      return null;
    }

    const story = await this.prisma.interactiveStory.findFirst({
      where: {
        seriesId: normalizedSeriesId,
        ...this.buildStoryFilter(access),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        seriesId: true,
        contentMode: true,
        series: {
          select: {
            adult: true,
          },
        },
      },
    });

    if (!story) {
      return null;
    }

    if (normalizeContentMode(story.contentMode) === "NORMAL" && story.series?.adult) {
      return null;
    }

    return {
      id: story.id,
      slug: story.slug,
      title: story.title,
      description: normalizeText(story.description),
      seriesId: story.seriesId,
      contentMode: normalizeContentMode(story.contentMode),
    };
  }

  async getStoryBySlug(slug: string, access: StoryAccessContext) {
    const normalizedSlug = normalizeText(slug);
    if (!normalizedSlug) {
      return null;
    }

    const story = await this.prisma.interactiveStory.findFirst({
      where: {
        slug: normalizedSlug,
        ...this.buildStoryFilter(access),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        baseContext: true,
        seriesId: true,
        contentMode: true,
        series: {
          select: {
            adult: true,
            coverUrl: true,
          },
        },
      },
    });

    if (!story) {
      return null;
    }

    if (normalizeContentMode(story.contentMode) === "NORMAL" && story.series?.adult) {
      return null;
    }

    return {
      id: story.id,
      slug: story.slug,
      title: story.title,
      description: normalizeText(story.description),
      baseContext: normalizeText(story.baseContext),
      seriesId: story.seriesId,
      coverImage: normalizeNullableText(story.series?.coverUrl),
      contentMode: normalizeContentMode(story.contentMode),
    };
  }

  async getOrInitProgress(
    storySlug: string,
    userId: string,
    access: StoryAccessContext,
  ): Promise<StoryProgressView | null> {
    const story = this.ensureSeriesCompatibility(
      await this.findStoryGraphBySlug(normalizeText(storySlug), access),
    );
    if (!story || story.nodes.length === 0) {
      return null;
    }

    const nodeById = this.buildNodeByIdMap(story);
    const startNode = this.getStartNode(story);
    if (!startNode) {
      return null;
    }

    const [progressRow, stateRow] = await Promise.all([
      this.prisma.userStoryProgress.findUnique({
        where: {
          userId_storyId: {
            userId,
            storyId: story.id,
          },
        },
      }),
      this.prisma.userStoryState.findUnique({
        where: {
          userId_storyId: {
            userId,
            storyId: story.id,
          },
        },
      }),
    ]);

    let progress = progressRow;
    const state = parseState(stateRow?.state || story.initialState);
    const flags = mergeFlags(state, parseStringArray(stateRow?.flags || []));
    state.flags = flags;

    if (!progress) {
      progress = await this.prisma.userStoryProgress.create({
        data: {
          userId,
          storyId: story.id,
          currentNodeId: startNode.id,
          lastGeneratedText: normalizeText(startNode.fallbackText || startNode.baseContext),
        },
      });
    }

    if (!stateRow) {
      await this.prisma.userStoryState.create({
        data: {
          userId,
          storyId: story.id,
          state: toInputJson(state),
          flags,
        },
      });
    }

    const currentNode = nodeById.get(progress.currentNodeId) || startNode;
    return this.toProgressView(
      story,
      currentNode,
      state,
      flags,
      progress.lastGeneratedText || null,
    );
  }

  private async isDuplicateChoiceSubmit(params: {
    userId: string;
    storyId: string;
    nodeId: string;
    choiceId: string;
    idempotencyKey?: string | null;
  }): Promise<boolean> {
    const now = Date.now();
    const windowStart = new Date(now - 20_000);

    const existing = await this.prisma.userStoryChoiceLog.findFirst({
      where: {
        userId: params.userId,
        storyId: params.storyId,
        nodeId: params.nodeId,
        choiceId: params.choiceId,
        createdAt: {
          gte: windowStart,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return true;
    }

    const normalizedKey = normalizeText(params.idempotencyKey);
    if (!normalizedKey) {
      return false;
    }

    const idempotency = await this.prisma.idempotencyKey.findUnique({
      where: {
        key: normalizedKey,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });

    if (!idempotency) {
      return false;
    }

    return idempotency.expiresAt.getTime() > now;
  }

  private async rememberIdempotencyKey(
    key: string | null | undefined,
    response: StoryProgressView,
  ) {
    const normalizedKey = normalizeText(key);
    if (!normalizedKey) {
      return;
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.idempotencyKey.upsert({
      where: { key: normalizedKey },
      update: {
        response: JSON.stringify(response),
        expiresAt,
      },
      create: {
        key: normalizedKey,
        response: JSON.stringify(response),
        expiresAt,
      },
    });
  }

  async submitChoice(
    input: SubmitChoiceInput,
    access: StoryAccessContext,
  ): Promise<
    | { ok: true; progress: StoryProgressView }
    | { ok: false; reason: "INVALID_CHOICE" | "CHOICE_LOCKED" | "DUPLICATE_SUBMIT" }
  > {
    const normalizedChoiceId = normalizeText(input.choiceId);
    if (!normalizedChoiceId) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const story = this.ensureSeriesCompatibility(
      await this.findStoryGraphBySlug(normalizeText(input.storySlug), access),
    );
    if (!story || story.nodes.length === 0) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const nodeById = this.buildNodeByIdMap(story);
    const startNode = this.getStartNode(story);
    if (!startNode) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const [progressRow, stateRow] = await Promise.all([
      this.prisma.userStoryProgress.findUnique({
        where: {
          userId_storyId: {
            userId: input.userId,
            storyId: story.id,
          },
        },
      }),
      this.prisma.userStoryState.findUnique({
        where: {
          userId_storyId: {
            userId: input.userId,
            storyId: story.id,
          },
        },
      }),
    ]);

    const progress = progressRow || {
      id: "",
      userId: input.userId,
      storyId: story.id,
      currentNodeId: startNode.id,
      lastChoiceId: null,
      lastChoiceAt: null,
      lastGeneratedText: normalizeText(startNode.fallbackText || startNode.baseContext),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const currentNode = nodeById.get(progress.currentNodeId) || startNode;
    const selectedChoice = currentNode.choices.find(
      (choice) => choice.id === normalizedChoiceId,
    );
    if (!selectedChoice) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    if (this.getLockedReason(selectedChoice)) {
      return { ok: false, reason: "CHOICE_LOCKED" };
    }

    const stateBefore = parseState(stateRow?.state || story.initialState);
    const flagsBefore = mergeFlags(stateBefore, parseStringArray(stateRow?.flags || []));
    stateBefore.flags = flagsBefore;

    if (!this.isChoiceAvailable(selectedChoice, flagsBefore)) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    if (!selectedChoice.targetNodeId) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const nextNode = nodeById.get(selectedChoice.targetNodeId);
    if (!nextNode) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const duplicate = await this.isDuplicateChoiceSubmit({
      userId: input.userId,
      storyId: story.id,
      nodeId: currentNode.id,
      choiceId: selectedChoice.id,
      idempotencyKey: input.idempotencyKey,
    });
    if (duplicate) {
      return { ok: false, reason: "DUPLICATE_SUBMIT" };
    }

    const afterChoiceState = applyEffects(stateBefore, selectedChoice.stateEffects);
    const nextState = applyEffects(afterChoiceState, nextNode.stateEffects);
    const nextFlags = mergeFlags(
      nextState,
      parseStringArray(nextState.flags),
      parseStringArray(nextNode.requiredFlags),
    );
    nextState.flags = nextFlags;

    const generatedText = normalizeText(nextNode.fallbackText || nextNode.baseContext);
    const timestamp = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.userStoryProgress.upsert({
        where: {
          userId_storyId: {
            userId: input.userId,
            storyId: story.id,
          },
        },
        update: {
          currentNodeId: nextNode.id,
          lastChoiceId: selectedChoice.id,
          lastChoiceAt: timestamp,
          lastGeneratedText: generatedText,
          updatedAt: timestamp,
        },
        create: {
          userId: input.userId,
          storyId: story.id,
          currentNodeId: nextNode.id,
          lastChoiceId: selectedChoice.id,
          lastChoiceAt: timestamp,
          lastGeneratedText: generatedText,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      await tx.userStoryState.upsert({
        where: {
          userId_storyId: {
            userId: input.userId,
            storyId: story.id,
          },
        },
        update: {
          state: toInputJson(nextState),
          flags: nextFlags,
          updatedAt: timestamp,
        },
        create: {
          userId: input.userId,
          storyId: story.id,
          state: toInputJson(nextState),
          flags: nextFlags,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      await tx.userStoryChoiceLog.create({
        data: {
          userId: input.userId,
          storyId: story.id,
          nodeId: currentNode.id,
          choiceId: selectedChoice.id,
          targetNodeId: nextNode.id,
          stateBefore: toInputJson(stateBefore),
          stateAfter: toInputJson(nextState),
          createdAt: timestamp,
        },
      });
    });

    const response = this.toProgressView(
      story,
      nextNode,
      nextState,
      nextFlags,
      generatedText,
    );
    await this.rememberIdempotencyKey(input.idempotencyKey, response);
    return { ok: true, progress: response };
  }
}
