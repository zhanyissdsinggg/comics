import { Injectable } from "@nestjs/common";
import type {
  InteractiveStory,
  InteractiveStoryChoice,
  InteractiveStoryNode,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { chargeWallet } from "../../common/utils/wallet";

type StoryState = Record<string, unknown>;
type ContentMode = "NORMAL" | "ADULT";
type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected";
type WalletSnapshot = {
  userId: string;
  paidPts: number;
  bonusPts: number;
  plan: string;
} | null;

type StoryWithGraph = InteractiveStory & {
  series: {
    id: string;
    title: string;
    adult: boolean;
    coverUrl?: string | null;
    genres?: string[];
  } | null;
  nodes: Array<
    InteractiveStoryNode & {
      choices: (InteractiveStoryChoice & {
        targetNode: InteractiveStoryNode | null;
      })[];
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
  unlockLabel: string | null;
  locked: boolean;
  lockedReason: string | null;
  unlocked: boolean;
};

type StoryNodeView = {
  id: string;
  key: string;
  title: string;
  content: string;
  isEnding: boolean;
  reviewStatus: ReviewStatus;
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
  genre: string[];
  endingsCount: number;
  choicesCount: number;
};

export type StoryDetailView = {
  id: string;
  slug: string;
  title: string;
  description: string;
  baseContext: string;
  seriesId: string | null;
  coverImage: string | null;
  contentMode: ContentMode;
  genre: string[];
  endingsCount: number;
  choicesCount: number;
  nodeCount: number;
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
  currentDepth: number;
  endingsReached: number;
  path: Array<{
    nodeId: string;
    nodeKey: string;
    title: string;
    isEnding: boolean;
  }>;
  node: StoryNodeView;
};

export type StoryAccessContext = {
  includeAdult: boolean;
};

type UnlockContext = {
  wallet: WalletSnapshot;
  subscription: {
    active?: boolean;
  } | null;
  unlockedChoiceIds: Set<string>;
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

function normalizeReviewStatus(value: unknown): ReviewStatus {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "draft") return "draft";
  if (normalized === "pending_review") return "pending_review";
  if (normalized === "rejected") return "rejected";
  return "approved";
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
  return value.map((item) => normalizeText(item)).filter(Boolean);
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
      nextState[key] = Number(nextState[key] || 0) + rawValue;
      continue;
    }
    nextState[key] = rawValue;
  }

  nextState.flags = mergeFlags(nextState, parseStringArray(nextState.flags));
  return nextState;
}

function parsePathNodeIds(value: unknown): string[] {
  return parseStringArray(value);
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
            coverUrl: true,
            genres: true,
          },
        },
        nodes: {
          orderBy: { sortOrder: "asc" },
          include: {
            choices: {
              orderBy: { sortOrder: "asc" },
              include: {
                targetNode: true,
              },
            },
          },
        },
      },
    }) as Promise<StoryWithGraph | null>;
  }

  private ensureSeriesCompatibility(story: StoryWithGraph | null): StoryWithGraph | null {
    if (!story) return null;
    if (normalizeContentMode(story.contentMode) === "NORMAL" && story.series?.adult) {
      return null;
    }
    return story;
  }

  private getApprovedNodes(story: StoryWithGraph) {
    return (story.nodes || []).filter(
      (node) => normalizeReviewStatus(node.reviewStatus) === "approved",
    );
  }

  private buildApprovedNodeById(story: StoryWithGraph) {
    return new Map(this.getApprovedNodes(story).map((node) => [node.id, node] as const));
  }

  private getStartNode(story: StoryWithGraph) {
    const approvedNodeById = this.buildApprovedNodeById(story);
    const initialNodeId = normalizeText(story.initialNodeId);
    if (initialNodeId && approvedNodeById.has(initialNodeId)) {
      return approvedNodeById.get(initialNodeId) || null;
    }
    return this.getApprovedNodes(story)[0] || null;
  }

  private getApprovedChoices(
    node: StoryWithGraph["nodes"][number],
    approvedNodeById: Map<string, StoryWithGraph["nodes"][number]>,
  ) {
    return (node.choices || []).filter((choice) => {
      const targetNodeId = normalizeText(choice.targetNodeId);
      return Boolean(targetNodeId && approvedNodeById.has(targetNodeId));
    });
  }

  private getSelectableChoices(node: StoryWithGraph["nodes"][number]) {
    return (node.choices || []).filter((choice) => Boolean(normalizeText(choice.targetNodeId)));
  }

  private isChoiceAvailable(choice: InteractiveStoryChoice, flags: string[]): boolean {
    const currentFlags = new Set(flags.map((item) => normalizeText(item)));
    const required = parseStringArray(choice.requiredFlags);
    const blocked = parseStringArray(choice.blockedFlags);
    return required.every((flag) => currentFlags.has(flag)) &&
      !blocked.some((flag) => currentFlags.has(flag));
  }

  private async getUnlockContext(userId: string, storyId: string) {
    const [wallet, subscription, unlocks] = await Promise.all([
      this.prisma.wallet.findUnique({
        where: { userId },
        select: { userId: true, paidPts: true, bonusPts: true, plan: true },
      }),
      this.prisma.subscription.findUnique({
        where: { userId },
        select: { userId: true, active: true, planId: true, expiresAt: true },
      }),
      this.prisma.userInteractiveChoiceUnlock.findMany({
        where: { userId, storyId },
        select: { choiceId: true },
      }),
    ]);
    return {
      wallet: wallet
        ? {
            userId: normalizeText(wallet.userId),
            paidPts: Number(wallet.paidPts || 0),
            bonusPts: Number(wallet.bonusPts || 0),
            plan: normalizeText(wallet.plan || "free") || "free",
          }
        : null,
      subscription,
      unlockedChoiceIds: new Set<string>(
        unlocks.map((item: { choiceId: string }) => normalizeText(item.choiceId)),
      ),
    };
  }

  private getLockedReason(
    choice: InteractiveStoryChoice,
    unlockContext?: UnlockContext,
  ): string | null {
    const choiceId = normalizeText(choice.id);
    if (unlockContext?.unlockedChoiceIds?.has(choiceId)) {
      return null;
    }
    if (choice.requiresPremium && !unlockContext?.subscription?.active) {
      return "PREMIUM_REQUIRED";
    }
    if (Number(choice.requiresTokens || 0) > 0) {
      const total =
        Number(unlockContext?.wallet?.paidPts || 0) +
        Number(unlockContext?.wallet?.bonusPts || 0);
      if (total < Number(choice.requiresTokens || 0)) {
        return "TOKENS_REQUIRED";
      }
    }
    return null;
  }

  private toChoiceView(
    choices: InteractiveStoryChoice[],
    flags: string[],
    unlockContext?: UnlockContext,
  ): StoryChoiceView[] {
    return choices
      .filter((choice) => this.isChoiceAvailable(choice, flags))
      .slice(0, 4)
      .map((choice) => {
        const lockedReason = this.getLockedReason(choice, unlockContext);
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
          unlocked: Boolean(
            unlockContext?.unlockedChoiceIds?.has(normalizeText(choice.id)),
          ),
        };
      });
  }

  private toNodeContent(node: InteractiveStoryNode, generatedText: string | null): string {
    const saved = normalizeText(generatedText);
    if (saved) return saved;
    const fallback = normalizeText(node.fallbackText);
    if (fallback) return fallback;
    const base = normalizeText(node.baseContext);
    if (base) return base;
    return "The story continues.";
  }

  private toPathView(
    nodeIds: string[],
    approvedNodeById: Map<string, StoryWithGraph["nodes"][number]>,
  ) {
    return nodeIds
      .map((nodeId) => approvedNodeById.get(nodeId))
      .filter(Boolean)
      .map((node) => ({
        nodeId: node!.id,
        nodeKey: node!.nodeKey,
        title: node!.title,
        isEnding: Boolean(node!.isEnding),
      }));
  }

  private toProgressView(params: {
    story: StoryWithGraph;
    node: StoryWithGraph["nodes"][number];
    state: StoryState;
    flags: string[];
    generatedText: string | null;
    pathNodeIds: string[];
    endingsReached: string[];
    approvedChoices: InteractiveStoryChoice[];
    unlockContext?: UnlockContext;
  }): StoryProgressView {
    const approvedNodeById = this.buildApprovedNodeById(params.story);
    return {
      story: {
        id: params.story.id,
        seriesId: params.story.seriesId,
        slug: params.story.slug,
        title: params.story.title,
        description: normalizeText(params.story.description),
        contentMode: normalizeContentMode(params.story.contentMode),
      },
      state: params.state,
      flags: params.flags,
      currentDepth: Math.max(1, params.pathNodeIds.length),
      endingsReached: params.endingsReached.length,
      path: this.toPathView(params.pathNodeIds, approvedNodeById),
      node: {
        id: params.node.id,
        key: params.node.nodeKey,
        title: params.node.title,
        content: this.toNodeContent(params.node, params.generatedText),
        isEnding: Boolean(params.node.isEnding),
        reviewStatus: normalizeReviewStatus(params.node.reviewStatus),
        choices: this.toChoiceView(
          params.approvedChoices,
          params.flags,
          params.unlockContext,
        ),
      },
    };
  }

  private countApprovedEndings(story: StoryWithGraph): number {
    return this.getApprovedNodes(story).filter((node) => Boolean(node.isEnding)).length;
  }

  private countApprovedChoices(story: StoryWithGraph): number {
    const approvedNodeById = this.buildApprovedNodeById(story);
    return this.getApprovedNodes(story).reduce(
      (sum, node) => sum + this.getApprovedChoices(node, approvedNodeById).length,
      0,
    );
  }

  async listStories(access: StoryAccessContext): Promise<StorySummaryView[]> {
    const stories = (await this.prisma.interactiveStory.findMany({
      where: this.buildStoryFilter(access),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        series: {
          select: {
            id: true,
            adult: true,
            coverUrl: true,
            genres: true,
          },
        },
        nodes: {
          orderBy: { sortOrder: "asc" },
          include: {
            choices: {
              orderBy: { sortOrder: "asc" },
              include: { targetNode: true },
            },
          },
        },
      },
    })) as StoryWithGraph[];

    return stories
      .map((story) => this.ensureSeriesCompatibility(story))
      .filter(Boolean)
      .map((story) => ({
        id: story!.id,
        slug: story!.slug,
        title: story!.title,
        description: normalizeText(story!.description),
        seriesId: story!.seriesId,
        coverImage: normalizeNullableText(story!.series?.coverUrl),
        contentMode: normalizeContentMode(story!.contentMode),
        genre: Array.isArray(story!.series?.genres) ? story!.series!.genres : [],
        endingsCount: this.countApprovedEndings(story!),
        choicesCount: this.countApprovedChoices(story!),
      }))
      .filter((story) => story.endingsCount > 0 || story.choicesCount > 0);
  }

  async getStoryBySeries(seriesId: string, access: StoryAccessContext) {
    const normalizedSeriesId = normalizeText(seriesId);
    if (!normalizedSeriesId) {
      return null;
    }

    const stub = await this.prisma.interactiveStory.findFirst({
      where: {
        seriesId: normalizedSeriesId,
        ...this.buildStoryFilter(access),
      },
      select: { slug: true },
    });
    if (!stub?.slug) {
      return null;
    }

    const story = this.ensureSeriesCompatibility(
      await this.findStoryGraphBySlug(stub.slug, access),
    );
    if (!story) {
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

  async getStoryBySlug(slug: string, access: StoryAccessContext): Promise<StoryDetailView | null> {
    const normalizedSlug = normalizeText(slug);
    if (!normalizedSlug) {
      return null;
    }

    const story = this.ensureSeriesCompatibility(
      await this.findStoryGraphBySlug(normalizedSlug, access),
    );
    if (!story) {
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
      genre: Array.isArray(story.series?.genres) ? story.series.genres : [],
      endingsCount: this.countApprovedEndings(story),
      choicesCount: this.countApprovedChoices(story),
      nodeCount: this.getApprovedNodes(story).length,
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
    if (!story || this.getApprovedNodes(story).length === 0) {
      return null;
    }

    const approvedNodeById = this.buildApprovedNodeById(story);
    const startNode = this.getStartNode(story);
    if (!startNode) {
      return null;
    }

    const [progressRow, stateRow, unlockContext] = await Promise.all([
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
      this.getUnlockContext(userId, story.id),
    ]);

    let progress = progressRow;
    const state = parseState(stateRow?.state || story.initialState);
    const flags = mergeFlags(state, parseStringArray(stateRow?.flags || []));
    state.flags = flags;
    const initialPath = [startNode.id];

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
          state: toInputJson({
            ...state,
            pathNodeIds: initialPath,
            endingsReached: [],
          }),
          flags,
        },
      });
    }

    const currentNode = approvedNodeById.get(progress.currentNodeId) || startNode;
    const pathNodeIds = parsePathNodeIds(state.pathNodeIds).length
      ? parsePathNodeIds(state.pathNodeIds)
      : initialPath;
    const endingsReached = parseStringArray(state.endingsReached);

    return this.toProgressView({
      story,
      node: currentNode,
      state,
      flags,
      generatedText: progress.lastGeneratedText || null,
      pathNodeIds,
      endingsReached,
      approvedChoices: this.getApprovedChoices(currentNode, approvedNodeById),
      unlockContext,
    });
  }

  async restartProgress(
    storySlug: string,
    userId: string,
    access: StoryAccessContext,
  ): Promise<StoryProgressView | null> {
    const story = this.ensureSeriesCompatibility(
      await this.findStoryGraphBySlug(normalizeText(storySlug), access),
    );
    if (!story) {
      return null;
    }
    const startNode = this.getStartNode(story);
    if (!startNode) {
      return null;
    }

    const baseState = parseState(story.initialState);
    const flags = mergeFlags(baseState, []);
    const nextState = {
      ...baseState,
      flags,
      pathNodeIds: [startNode.id],
      endingsReached: [],
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.userStoryProgress.upsert({
        where: {
          userId_storyId: {
            userId,
            storyId: story.id,
          },
        },
        update: {
          currentNodeId: startNode.id,
          lastChoiceId: null,
          lastChoiceAt: null,
          lastGeneratedText: normalizeText(startNode.fallbackText || startNode.baseContext),
        },
        create: {
          userId,
          storyId: story.id,
          currentNodeId: startNode.id,
          lastGeneratedText: normalizeText(startNode.fallbackText || startNode.baseContext),
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
          flags,
        },
        create: {
          userId,
          storyId: story.id,
          state: toInputJson(nextState),
          flags,
        },
      });
    });

    const unlockContext = await this.getUnlockContext(userId, story.id);
    return this.toProgressView({
      story,
      node: startNode,
      state: nextState,
      flags,
      generatedText: normalizeText(startNode.fallbackText || startNode.baseContext),
      pathNodeIds: [startNode.id],
      endingsReached: [],
      approvedChoices: this.getApprovedChoices(startNode, this.buildApprovedNodeById(story)),
      unlockContext,
    });
  }

  async unlockChoice(
    input: SubmitChoiceInput,
    access: StoryAccessContext,
  ): Promise<
    | { ok: true; progress: StoryProgressView; unlockedChoiceId: string }
    | {
        ok: false;
        reason:
          | "INVALID_CHOICE"
          | "TARGET_NODE_NOT_AVAILABLE"
          | "PREMIUM_REQUIRED"
          | "TOKENS_REQUIRED";
      }
  > {
    const normalizedChoiceId = normalizeText(input.choiceId);
    if (!normalizedChoiceId) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const story = this.ensureSeriesCompatibility(
      await this.findStoryGraphBySlug(normalizeText(input.storySlug), access),
    );
    if (!story || this.getApprovedNodes(story).length === 0) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const approvedNodeById = this.buildApprovedNodeById(story);
    const startNode = this.getStartNode(story);
    if (!startNode) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const [progressRow, stateRow, unlockContext] = await Promise.all([
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
      this.getUnlockContext(input.userId, story.id),
    ]);

    const state = parseState(stateRow?.state || story.initialState);
    const flags = mergeFlags(state, parseStringArray(stateRow?.flags || []));
    state.flags = flags;
    const currentNode = approvedNodeById.get(progressRow?.currentNodeId || "") || startNode;
    const availableChoices = this.getApprovedChoices(currentNode, approvedNodeById);
    const selectableChoices = this.getSelectableChoices(currentNode);
    const selectedChoice = selectableChoices.find((choice) => choice.id === normalizedChoiceId);
    if (!selectedChoice || !this.isChoiceAvailable(selectedChoice, flags)) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const targetNodeId = normalizeText(selectedChoice.targetNodeId);
    const nextNode = approvedNodeById.get(targetNodeId);
    if (!nextNode || normalizeReviewStatus(nextNode.reviewStatus) !== "approved") {
      return { ok: false, reason: "TARGET_NODE_NOT_AVAILABLE" };
    }

    const unlockResult = await this.unlockChoiceIfNeeded({
      userId: input.userId,
      storyId: story.id,
      choice: selectedChoice,
      wallet: unlockContext.wallet,
      subscription: unlockContext.subscription,
      unlockedChoiceIds: unlockContext.unlockedChoiceIds,
    });
    if (!unlockResult.ok) {
      return {
        ok: false,
        reason: unlockResult.reason,
      };
    }
    unlockContext.wallet = unlockResult.wallet;

    const pathNodeIds = parsePathNodeIds(state.pathNodeIds).length
      ? parsePathNodeIds(state.pathNodeIds)
      : [currentNode.id];
    const endingsReached = parseStringArray(state.endingsReached);
    const progress = this.toProgressView({
      story,
      node: currentNode,
      state,
      flags,
      generatedText:
        normalizeText(progressRow?.lastGeneratedText || currentNode.fallbackText || currentNode.baseContext) ||
        null,
      pathNodeIds,
      endingsReached,
      approvedChoices: availableChoices,
      unlockContext,
    });

    return {
      ok: true,
      progress,
      unlockedChoiceId: selectedChoice.id,
    };
  }

  private async getChoiceReplay(userId: string, idempotencyKey: string | null | undefined) {
    const normalizedKey = normalizeText(idempotencyKey);
    if (!normalizedKey) {
      return null;
    }
    const record = await this.prisma.idempotencyKey.findUnique({
      where: { key: `interactive:${userId}:${normalizedKey}` },
      select: {
        response: true,
        expiresAt: true,
      },
    });
    if (!record || record.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    try {
      const parsed = JSON.parse(String(record.response || "{}"));
      return parsed?.progress ? parsed : null;
    } catch {
      return null;
    }
  }

  private async rememberChoiceReplay(
    userId: string,
    idempotencyKey: string | null | undefined,
    progress: StoryProgressView,
  ) {
    const normalizedKey = normalizeText(idempotencyKey);
    if (!normalizedKey) {
      return;
    }
    await this.prisma.idempotencyKey.upsert({
      where: { key: `interactive:${userId}:${normalizedKey}` },
      update: {
        response: JSON.stringify({ progress }),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      create: {
        key: `interactive:${userId}:${normalizedKey}`,
        response: JSON.stringify({ progress }),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  }

  private async unlockChoiceIfNeeded(params: {
    userId: string;
    storyId: string;
    choice: InteractiveStoryChoice;
    wallet: WalletSnapshot;
    subscription: { active?: boolean } | null;
    unlockedChoiceIds: Set<string>;
  }) {
    const choiceId = normalizeText(params.choice.id);
    if (params.unlockedChoiceIds.has(choiceId)) {
      return { ok: true as const, wallet: params.wallet };
    }

    if (params.choice.requiresPremium) {
      if (!params.subscription?.active) {
        return { ok: false as const, reason: "PREMIUM_REQUIRED" as const };
      }
      await this.prisma.userInteractiveChoiceUnlock.upsert({
        where: {
          userId_choiceId: {
            userId: params.userId,
            choiceId: params.choice.id,
          },
        },
        update: {
          unlockType: "premium",
          tokensPaid: 0,
        },
        create: {
          userId: params.userId,
          storyId: params.storyId,
          choiceId: params.choice.id,
          unlockType: "premium",
          tokensPaid: 0,
        },
      });
      params.unlockedChoiceIds.add(choiceId);
    }

    if (Number(params.choice.requiresTokens || 0) > 0 && !params.unlockedChoiceIds.has(choiceId)) {
      const chargeResult = chargeWallet(
        params.wallet || { paidPts: 0, bonusPts: 0 },
        Number(params.choice.requiresTokens || 0),
      );
      if (!chargeResult.ok) {
        return { ok: false as const, reason: "TOKENS_REQUIRED" as const };
      }

      const nextWallet = await this.prisma.wallet.upsert({
        where: { userId: params.userId },
        update: {
          paidPts: chargeResult.wallet.paidPts || 0,
          bonusPts: chargeResult.wallet.bonusPts || 0,
        },
        create: {
          userId: params.userId,
          paidPts: chargeResult.wallet.paidPts || 0,
          bonusPts: chargeResult.wallet.bonusPts || 0,
          plan: params.wallet?.plan || "free",
        },
      });

      await this.prisma.userInteractiveChoiceUnlock.upsert({
        where: {
          userId_choiceId: {
            userId: params.userId,
            choiceId: params.choice.id,
          },
        },
        update: {
          unlockType: "tokens",
          tokensPaid: Number(params.choice.requiresTokens || 0),
        },
        create: {
          userId: params.userId,
          storyId: params.storyId,
          choiceId: params.choice.id,
          unlockType: "tokens",
          tokensPaid: Number(params.choice.requiresTokens || 0),
        },
      });
      params.unlockedChoiceIds.add(choiceId);
      return { ok: true as const, wallet: nextWallet };
    }

    return { ok: true as const, wallet: params.wallet };
  }

  async submitChoice(
    input: SubmitChoiceInput,
    access: StoryAccessContext,
  ): Promise<
    | { ok: true; progress: StoryProgressView; replay?: boolean }
    | {
        ok: false;
        reason:
          | "INVALID_CHOICE"
      | "TARGET_NODE_NOT_AVAILABLE"
      | "PREMIUM_REQUIRED"
      | "TOKENS_REQUIRED";
      }
  > {
    const normalizedChoiceId = normalizeText(input.choiceId);
    if (!normalizedChoiceId) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const replay = await this.getChoiceReplay(input.userId, input.idempotencyKey);
    if (replay?.progress) {
      return { ok: true, progress: replay.progress, replay: true };
    }

    const story = this.ensureSeriesCompatibility(
      await this.findStoryGraphBySlug(normalizeText(input.storySlug), access),
    );
    if (!story || this.getApprovedNodes(story).length === 0) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const approvedNodeById = this.buildApprovedNodeById(story);
    const startNode = this.getStartNode(story);
    if (!startNode) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const [progressRow, stateRow, unlockContext] = await Promise.all([
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
      this.getUnlockContext(input.userId, story.id),
    ]);

    const stateBefore = parseState(stateRow?.state || story.initialState);
    const flagsBefore = mergeFlags(stateBefore, parseStringArray(stateRow?.flags || []));
    stateBefore.flags = flagsBefore;
    const pathBefore = parsePathNodeIds(stateBefore.pathNodeIds).length
      ? parsePathNodeIds(stateBefore.pathNodeIds)
      : [startNode.id];
    const endingsReachedBefore = parseStringArray(stateBefore.endingsReached);

    const currentNode = approvedNodeById.get(progressRow?.currentNodeId || "") || startNode;
    const availableChoices = this.getApprovedChoices(currentNode, approvedNodeById);
    const selectableChoices = this.getSelectableChoices(currentNode);
    const selectedChoice = selectableChoices.find((choice) => choice.id === normalizedChoiceId);
    if (!selectedChoice || !this.isChoiceAvailable(selectedChoice, flagsBefore)) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const targetNodeId = normalizeText(selectedChoice.targetNodeId);
    const nextNode = approvedNodeById.get(targetNodeId);
    if (!nextNode || normalizeReviewStatus(nextNode.reviewStatus) !== "approved") {
      return { ok: false, reason: "TARGET_NODE_NOT_AVAILABLE" };
    }

    const lockedReason = this.getLockedReason(selectedChoice, unlockContext);
    if (lockedReason) {
      const unlockResult = await this.unlockChoiceIfNeeded({
        userId: input.userId,
        storyId: story.id,
        choice: selectedChoice,
        wallet: unlockContext.wallet,
        subscription: unlockContext.subscription,
        unlockedChoiceIds: unlockContext.unlockedChoiceIds,
      });
      if (!unlockResult.ok) {
        return {
          ok: false,
          reason: unlockResult.reason,
        };
      }
      unlockContext.wallet = unlockResult.wallet;
    }

    const nextState = applyEffects(
      applyEffects(stateBefore, selectedChoice.stateEffects),
      nextNode.stateEffects,
    );
    const nextFlags = mergeFlags(nextState, parseStringArray(nextState.flags));
    nextState.flags = nextFlags;
    nextState.pathNodeIds = [...pathBefore, nextNode.id];
    nextState.endingsReached = nextNode.isEnding
      ? [...new Set([...endingsReachedBefore, nextNode.id])]
      : endingsReachedBefore;

    const generatedText = normalizeText(nextNode.fallbackText || nextNode.baseContext);
    const now = new Date();

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
          lastChoiceAt: now,
          lastGeneratedText: generatedText,
          updatedAt: now,
        },
        create: {
          userId: input.userId,
          storyId: story.id,
          currentNodeId: nextNode.id,
          lastChoiceId: selectedChoice.id,
          lastChoiceAt: now,
          lastGeneratedText: generatedText,
          createdAt: now,
          updatedAt: now,
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
          updatedAt: now,
        },
        create: {
          userId: input.userId,
          storyId: story.id,
          state: toInputJson(nextState),
          flags: nextFlags,
          createdAt: now,
          updatedAt: now,
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
          createdAt: now,
        },
      });
    });

    const progress = this.toProgressView({
      story,
      node: nextNode,
      state: nextState,
      flags: nextFlags,
      generatedText,
      pathNodeIds: parsePathNodeIds(nextState.pathNodeIds),
      endingsReached: parseStringArray(nextState.endingsReached),
      approvedChoices: this.getApprovedChoices(nextNode, approvedNodeById),
      unlockContext,
    });
    await this.rememberChoiceReplay(input.userId, input.idempotencyKey, progress);
    return { ok: true, progress };
  }
}
