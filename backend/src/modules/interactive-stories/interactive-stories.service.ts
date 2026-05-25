import { Injectable } from "@nestjs/common";
import type {
  InteractiveStory,
  InteractiveStoryChoice,
  InteractiveStoryNode,
  InteractivePanel,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { InteractiveAiService } from "./interactive-ai.service";

type StoryState = Record<string, unknown>;

type ContentMode = "normal" | "adult";

type StoryWithGraph = InteractiveStory & {
  nodes: Array<
    InteractiveStoryNode & {
      choices: InteractiveStoryChoice[];
      panels: InteractivePanel[];
    }
  >;
};

type StoryChoiceView = {
  id: string;
  key: string;
  label: string;
  description: string;
  requiresPremium: boolean;
  requiresTokens: number;
};

type StoryNodeView = {
  id: string;
  key: string;
  title: string;
  body: string;
  imageUrl: string;
  panels: StoryPanelView[];
  isEnding: boolean;
  endingType: string;
  choices: StoryChoiceView[];
};

type StoryPanelView = {
  id: string;
  panelNumber: number;
  imageUrl: string;
  dialogue: string;
};

type StoryProgressView = {
  story: {
    id: string;
    seriesId: string | null;
    slug: string;
    title: string;
    description: string;
    coverImage: string;
    genre: string;
    contentMode: ContentMode;
    status: string;
  };
  state: StoryState;
  flags: string[];
  path: string[];
  choices: string[];
  node: StoryNodeView;
};

type StoryListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  genre: string;
  contentMode: ContentMode;
  status: string;
  seriesId: string | null;
  updatedAt: Date;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeContentMode(value: unknown): ContentMode {
  return String(value || "").trim().toLowerCase() === "adult"
    ? "adult"
    : "normal";
}

function isApprovedReviewStatus(value: unknown): boolean {
  return normalizeText(value).toLowerCase() === "approved";
}

function parseState(value: Prisma.JsonValue | null | undefined): StoryState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function parseJsonStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => normalizeText(item)).filter(Boolean);
}

function toInputJson(value: StoryState | string[]): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
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
      const mergedFlags = mergeFlags(
        nextState,
        parseStringArray(nextState.flags),
        parseStringArray(rawValue),
      );
      nextState.flags = mergedFlags;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly interactiveAiService: InteractiveAiService,
  ) {}

  private publicWhere(contentMode: ContentMode): Prisma.InteractiveStoryWhereInput {
    return {
      contentMode,
      OR: [{ status: "published" }, { isPublished: true }],
    };
  }

  private publicNodeWhere(): Prisma.InteractiveStoryNodeWhereInput {
    return {
      reviewStatus: "approved",
    };
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
      if (found && isApprovedReviewStatus(found.reviewStatus)) {
        return found;
      }
    }
    return story.nodes.find((node) => isApprovedReviewStatus(node.reviewStatus)) || null;
  }

  private isPublicNode(node: InteractiveStoryNode | null | undefined): boolean {
    if (!node) {
      return false;
    }
    return isApprovedReviewStatus(node.reviewStatus);
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

  private toChoiceView(choices: InteractiveStoryChoice[], flags: string[]): StoryChoiceView[] {
    return choices
      .filter((choice) => this.isChoiceAvailable(choice, flags))
      .slice(0, 3)
      .map((choice) => ({
        id: choice.id,
        key: normalizeText(choice.choiceKey),
        label: normalizeText(choice.label),
        description: normalizeText(choice.description),
        requiresPremium: Boolean(choice.requiresPremium),
        requiresTokens: Number(choice.requiresTokens || 0),
      }));
  }

  private toNodeBody(node: InteractiveStoryNode, generatedText: string | null) {
    const fromGenerated = normalizeText(generatedText);
    if (fromGenerated) {
      return fromGenerated;
    }

    const fromBody = normalizeText(node.body);
    if (fromBody) {
      return fromBody;
    }

    const fromFallback = normalizeText(node.fallbackText);
    if (fromFallback) {
      return fromFallback;
    }

    const fromContext = normalizeText(node.baseContext);
    if (fromContext) {
      return fromContext;
    }

    return "The story continues.";
  }

  private toPanelView(panels: InteractivePanel[]): StoryPanelView[] {
    return panels
      .filter((panel) => normalizeText(panel.reviewStatus).toLowerCase() === "approved")
      .map((panel) => ({
        id: panel.id,
        panelNumber: Number(panel.panelNumber || 0),
        imageUrl: normalizeText(panel.finalImageUrl || panel.imageUrl),
        dialogue: normalizeText(panel.dialogue),
      }))
      .filter((panel) => panel.imageUrl)
      .sort((left, right) => left.panelNumber - right.panelNumber)
      .slice(0, 3);
  }

  private toStorySummary(story: InteractiveStory) {
    return {
      id: story.id,
      seriesId: story.seriesId,
      slug: normalizeText(story.slug),
      title: normalizeText(story.title),
      description: normalizeText(story.description),
      coverImage: normalizeText(story.coverImage),
      genre: normalizeText(story.genre),
      contentMode: normalizeContentMode(story.contentMode),
      status: normalizeText(story.status || (story.isPublished ? "published" : "draft")) || "draft",
    };
  }

  private toProgressView(
    story: StoryWithGraph,
    node: StoryWithGraph["nodes"][number],
    state: StoryState,
    flags: string[],
    path: string[],
    choices: string[],
    generatedText: string | null,
  ): StoryProgressView {
    return {
      story: this.toStorySummary(story),
      state,
      flags,
      path,
      choices,
      node: {
        id: node.id,
        key: normalizeText(node.nodeKey),
        title: normalizeText(node.title),
        body: this.toNodeBody(node, generatedText),
        imageUrl: normalizeText(node.imageUrl),
        panels: this.toPanelView(node.panels || []),
        isEnding: Boolean(node.isEnding),
        endingType: normalizeText(node.endingType),
        choices: this.toChoiceView(node.choices, flags),
      },
    };
  }

  private async findStoryGraphById(
    storyId: string,
    contentMode?: ContentMode,
  ): Promise<StoryWithGraph | null> {
    const normalizedStoryId = normalizeText(storyId);
    if (!normalizedStoryId) {
      return null;
    }

    const where: Prisma.InteractiveStoryWhereInput = {
      id: normalizedStoryId,
      ...(contentMode ? this.publicWhere(contentMode) : {}),
    };

    return this.prisma.interactiveStory.findFirst({
      where,
      include: {
        nodes: {
          where: this.publicNodeWhere(),
          orderBy: [{ orderIndex: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            choices: {
              orderBy: [{ orderIndex: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
            },
            panels: {
              where: {
                reviewStatus: "approved",
              },
              orderBy: [{ panelNumber: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
    }) as Promise<StoryWithGraph | null>;
  }

  private async findStoryGraphBySlug(
    slug: string,
    contentMode: ContentMode,
  ): Promise<StoryWithGraph | null> {
    const normalizedSlug = normalizeText(slug);
    if (!normalizedSlug) {
      return null;
    }

    return this.prisma.interactiveStory.findFirst({
      where: {
        slug: normalizedSlug,
        ...this.publicWhere(contentMode),
      },
      include: {
        nodes: {
          where: this.publicNodeWhere(),
          orderBy: [{ orderIndex: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            choices: {
              orderBy: [{ orderIndex: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
            },
            panels: {
              where: {
                reviewStatus: "approved",
              },
              orderBy: [{ panelNumber: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
    }) as Promise<StoryWithGraph | null>;
  }

  async listStories(contentMode: ContentMode, query = ""): Promise<StoryListItem[]> {
    const normalizedQuery = normalizeText(query).toLowerCase();
    const stories = await this.prisma.interactiveStory.findMany({
      where: {
        ...this.publicWhere(contentMode),
        ...(normalizedQuery
          ? {
              OR: [
                { title: { contains: normalizedQuery, mode: "insensitive" } },
                { slug: { contains: normalizedQuery, mode: "insensitive" } },
                { description: { contains: normalizedQuery, mode: "insensitive" } },
                { genre: { contains: normalizedQuery, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        coverImage: true,
        genre: true,
        contentMode: true,
        status: true,
        seriesId: true,
        updatedAt: true,
      },
    });

    return stories.map((story) => ({
      id: story.id,
      slug: normalizeText(story.slug),
      title: normalizeText(story.title),
      description: normalizeText(story.description),
      coverImage: normalizeText(story.coverImage),
      genre: normalizeText(story.genre),
      contentMode: normalizeContentMode(story.contentMode),
      status: normalizeText(story.status) || "draft",
      seriesId: story.seriesId,
      updatedAt: story.updatedAt,
    }));
  }

  async getStoryBySeries(seriesId: string, contentMode?: ContentMode) {
    const normalizedSeriesId = normalizeText(seriesId);
    if (!normalizedSeriesId) {
      return null;
    }

    const story = await this.prisma.interactiveStory.findFirst({
      where: {
        seriesId: normalizedSeriesId,
        ...(contentMode ? this.publicWhere(contentMode) : { OR: [{ status: "published" }, { isPublished: true }] }),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        coverImage: true,
        genre: true,
        contentMode: true,
        status: true,
        seriesId: true,
      },
    });

    if (!story) {
      return null;
    }

    return {
      id: story.id,
      slug: normalizeText(story.slug),
      title: normalizeText(story.title),
      description: normalizeText(story.description),
      coverImage: normalizeText(story.coverImage),
      genre: normalizeText(story.genre),
      contentMode: normalizeContentMode(story.contentMode),
      status: normalizeText(story.status) || "draft",
      seriesId: story.seriesId,
    };
  }

  async getStoryBySlug(slug: string, contentMode: ContentMode) {
    const story = await this.findStoryGraphBySlug(slug, contentMode);
    if (!story) {
      return null;
    }

    const startNode = this.getStartNode(story);
    return {
      ...this.toStorySummary(story),
      startNodeKey: normalizeText(startNode?.nodeKey),
      nodeCount: Array.isArray(story.nodes) ? story.nodes.length : 0,
      endingCount: Array.isArray(story.nodes)
        ? story.nodes.filter((node) => node.isEnding).length
        : 0,
    };
  }

  async getStory(storyId: string, contentMode?: ContentMode) {
    const story = await this.findStoryGraphById(storyId, contentMode);
    if (!story) {
      return null;
    }
    return this.toStorySummary(story);
  }

  async getOrInitProgress(
    storyId: string,
    userId: string,
    contentMode?: ContentMode,
  ): Promise<StoryProgressView | null> {
    const story = await this.findStoryGraphById(storyId, contentMode);
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
    let state = parseState(stateRow?.state || story.initialState);
    let flags = mergeFlags(state, parseStringArray(stateRow?.flags || []));
    const path = parseJsonStringArray(progressRow?.pathJson || []);
    const choices = parseJsonStringArray(progressRow?.choicesJson || []);
    state.flags = flags;

    if (!progress) {
      progress = await this.prisma.userStoryProgress.create({
        data: {
          userId,
          storyId: story.id,
          currentNodeId: startNode.id,
          pathJson: [startNode.id] as unknown as Prisma.InputJsonValue,
          choicesJson: [] as unknown as Prisma.InputJsonValue,
          lastGeneratedText: normalizeText(startNode.body || startNode.fallbackText || startNode.baseContext),
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
    if (!this.isPublicNode(currentNode)) {
      return null;
    }
    const resolvedPath = parseJsonStringArray(progress.pathJson || []);
    const nextPath = resolvedPath.length > 0 ? resolvedPath : [currentNode.id];
    const nextChoices = parseJsonStringArray(progress.choicesJson || []);

    return this.toProgressView(
      story,
      currentNode,
      state,
      flags,
      nextPath,
      nextChoices,
      progress.lastGeneratedText || null,
    );
  }

  async getOrInitProgressBySlug(slug: string, userId: string, contentMode: ContentMode) {
    const story = await this.findStoryGraphBySlug(slug, contentMode);
    if (!story) {
      return null;
    }
    return this.getOrInitProgress(story.id, userId, contentMode);
  }

  async submitChoice(
    storyId: string,
    userId: string,
    choiceId: string,
    contentMode?: ContentMode,
  ): Promise<StoryProgressView | null> {
    const normalizedChoiceId = normalizeText(choiceId);
    if (!normalizedChoiceId) {
      return null;
    }

    const story = await this.findStoryGraphById(storyId, contentMode);
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

    const progress = progressRow || {
      id: "",
      userId,
      storyId: story.id,
      currentNodeId: startNode.id,
      lastChoiceId: null,
      pathJson: [startNode.id],
      choicesJson: [],
      lastChoiceAt: null,
      lastGeneratedText: normalizeText(startNode.body || startNode.fallbackText || startNode.baseContext),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const currentNode = nodeById.get(progress.currentNodeId) || startNode;
    if (!this.isPublicNode(currentNode)) {
      return null;
    }
    const selectedChoice = currentNode.choices.find((choice) => choice.id === normalizedChoiceId);
    if (!selectedChoice) {
      return null;
    }

    const stateBefore = parseState(stateRow?.state || story.initialState);
    const flagsBefore = mergeFlags(stateBefore, parseStringArray(stateRow?.flags || []));
    stateBefore.flags = flagsBefore;

    if (!this.isChoiceAvailable(selectedChoice, flagsBefore)) {
      return null;
    }

    if (!selectedChoice.targetNodeId) {
      return null;
    }

    const nextNode = nodeById.get(selectedChoice.targetNodeId);
    if (!nextNode || !this.isPublicNode(nextNode)) {
      return null;
    }

    const afterChoiceState = applyEffects(stateBefore, selectedChoice.stateEffects);
    const nextState = applyEffects(afterChoiceState, nextNode.stateEffects);
    const nextFlags = mergeFlags(
      nextState,
      parseStringArray(nextState.flags),
      parseStringArray(nextNode.requiredFlags),
    );
    nextState.flags = nextFlags;

    const visibleNextChoices = this.toChoiceView(nextNode.choices, nextFlags);
    const aiResult = await this.interactiveAiService.generateSegment({
      story: {
        id: story.id,
        title: story.title,
        baseContext: normalizeText(story.baseContext),
      },
      node: {
        id: nextNode.id,
        title: nextNode.title,
        baseContext: normalizeText(nextNode.baseContext || nextNode.body),
        basePrompt: normalizeText(nextNode.basePrompt),
        fallbackText: normalizeText(nextNode.body || nextNode.fallbackText),
      },
      selectedChoice: {
        id: selectedChoice.id,
        key: selectedChoice.choiceKey,
        label: selectedChoice.label,
      },
      state: nextState,
      choices: visibleNextChoices.map((choice) => ({
        id: choice.id,
        key: choice.key,
        label: choice.label,
      })),
    });

    const generatedText = normalizeText(aiResult.content) || normalizeText(nextNode.body || nextNode.fallbackText || nextNode.baseContext);
    const timestamp = new Date();
    const previousPath = parseJsonStringArray(progress.pathJson || []);
    const previousChoices = parseJsonStringArray(progress.choicesJson || []);
    const nextPath = [...(previousPath.length > 0 ? previousPath : [currentNode.id]), nextNode.id];
    const nextChoicesPath = [...previousChoices, selectedChoice.id];

    await this.prisma.$transaction(async (tx) => {
      await tx.userStoryProgress.upsert({
        where: {
          userId_storyId: {
            userId,
            storyId: story.id,
          },
        },
        update: {
          currentNodeId: nextNode.id,
          lastChoiceId: selectedChoice.id,
          pathJson: nextPath as unknown as Prisma.InputJsonValue,
          choicesJson: nextChoicesPath as unknown as Prisma.InputJsonValue,
          lastChoiceAt: timestamp,
          lastGeneratedText: generatedText,
          updatedAt: timestamp,
        },
        create: {
          userId,
          storyId: story.id,
          currentNodeId: nextNode.id,
          lastChoiceId: selectedChoice.id,
          pathJson: nextPath as unknown as Prisma.InputJsonValue,
          choicesJson: nextChoicesPath as unknown as Prisma.InputJsonValue,
          lastChoiceAt: timestamp,
          lastGeneratedText: generatedText,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      await tx.userStoryState.upsert({
        where: {
          userId_storyId: {
            userId,
            storyId: story.id,
          },
        },
        update: {
          state: toInputJson(nextState),
          flags: nextFlags,
          updatedAt: timestamp,
        },
        create: {
          userId,
          storyId: story.id,
          state: toInputJson(nextState),
          flags: nextFlags,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      });

      await tx.userStoryChoiceLog.create({
        data: {
          userId,
          storyId: story.id,
          nodeId: currentNode.id,
          choiceId: selectedChoice.id,
          targetNodeId: nextNode.id,
          stateBefore: toInputJson(stateBefore),
          stateAfter: toInputJson(nextState),
          createdAt: timestamp,
        },
      });

      await tx.storyGenerationLog.create({
        data: {
          userId,
          storyId: story.id,
          nodeId: nextNode.id,
          choiceId: selectedChoice.id,
          status: aiResult.status,
          provider: aiResult.provider,
          model: aiResult.model,
          prompt: aiResult.prompt,
          response: aiResult.rawResponse,
          errorMessage: aiResult.errorMessage,
          latencyMs: aiResult.latencyMs,
          createdAt: timestamp,
        },
      });
    });

    return this.toProgressView(
      story,
      nextNode,
      nextState,
      nextFlags,
      nextPath,
      nextChoicesPath,
      generatedText,
    );
  }

  async submitChoiceBySlug(
    slug: string,
    userId: string,
    choiceId: string,
    contentMode: ContentMode,
  ) {
    const story = await this.findStoryGraphBySlug(slug, contentMode);
    if (!story) {
      return null;
    }
    return this.submitChoice(story.id, userId, choiceId, contentMode);
  }
}
