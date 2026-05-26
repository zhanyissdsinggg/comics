import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  InteractiveStoryChoice,
  InteractiveStoryNode,
} from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { chargeWallet } from "../../common/utils/wallet";

type StoryState = Record<string, unknown>;
type ContentMode = "NORMAL" | "ADULT";
type ReviewStatus = "draft" | "pending_review" | "approved" | "rejected";
type UnlockPolicy =
  | "FREE"
  | "PREMIUM_ONLY"
  | "TOKENS_ONLY"
  | "PREMIUM_OR_TOKENS"
  | "PREMIUM_AND_TOKENS";

export type StoryAccessContext = {
  includeAdult: boolean;
};

type StorySeries = {
  id: string;
  title: string;
  adult: boolean;
  coverUrl?: string | null;
  genres?: string[];
} | null;

type StoryGraphNode = InteractiveStoryNode & {
  choices: Array<
    InteractiveStoryChoice & {
      unlockPolicy?: UnlockPolicy;
      targetNode: InteractiveStoryNode | null;
    }
  >;
};

type StoryWithGraph = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  baseContext: string | null;
  contentMode: ContentMode;
  targetAudience: string | null;
  seriesId: string | null;
  initialNodeId: string | null;
  initialState: Prisma.JsonValue | null;
  isPublished: boolean;
  publishedVersion: number;
  aiEnabled: boolean;
  series: StorySeries;
  nodes: StoryGraphNode[];
};

type WalletSnapshot = {
  userId: string;
  paidPts: number;
  bonusPts: number;
  plan: string;
} | null;

type UnlockContext = {
  wallet: WalletSnapshot;
  subscription: { active?: boolean } | null;
  unlockedChoiceIds: Set<string>;
};

type StoryChoiceView = {
  id: string;
  key: string;
  label: string;
  description: string;
  unlockPolicy: UnlockPolicy;
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

export type SubmitChoiceInput = {
  storySlug: string;
  userId: string;
  choiceId: string;
  idempotencyKey?: string | null;
};

type ChoiceResultReason =
  | "INVALID_CHOICE"
  | "TARGET_NODE_NOT_AVAILABLE"
  | "PREMIUM_REQUIRED"
  | "TOKENS_REQUIRED";

type ChoiceScope = {
  operation: string;
  userId: string;
  storyId: string;
  fromNodeId: string;
  choiceId: string;
  requestKey: string;
};

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function normalizeContentMode(value: unknown): ContentMode {
  return String(value || "").trim().toUpperCase() === "ADULT" ? "ADULT" : "NORMAL";
}

function normalizeReviewStatus(value: unknown): ReviewStatus {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "draft") return "draft";
  if (normalized === "pending_review") return "pending_review";
  if (normalized === "rejected") return "rejected";
  return "approved";
}

function normalizeUnlockPolicy(
  value: unknown,
  requiresPremium = false,
  requiresTokens = 0,
): UnlockPolicy {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "FREE") return "FREE";
  if (normalized === "PREMIUM_ONLY") return "PREMIUM_ONLY";
  if (normalized === "TOKENS_ONLY") return "TOKENS_ONLY";
  if (normalized === "PREMIUM_OR_TOKENS") return "PREMIUM_OR_TOKENS";
  if (normalized === "PREMIUM_AND_TOKENS") return "PREMIUM_AND_TOKENS";
  if (requiresPremium && requiresTokens > 0) return "PREMIUM_OR_TOKENS";
  if (requiresPremium) return "PREMIUM_ONLY";
  if (requiresTokens > 0) return "TOKENS_ONLY";
  return "FREE";
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

function parsePathNodeIds(value: unknown): string[] {
  return parseStringArray(value);
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

function buildScopedKey(scope: ChoiceScope) {
  return [
    scope.operation,
    scope.userId,
    scope.storyId,
    scope.fromNodeId,
    scope.choiceId,
    scope.requestKey,
  ].join(":");
}

function parseReplayPayload(record: { body?: unknown; response?: string | null } | null | undefined) {
  if (!record) {
    return null;
  }
  if (record.body && typeof record.body === "object" && !Array.isArray(record.body)) {
    return (record.body as Record<string, any>)?.progress || null;
  }
  try {
    return JSON.parse(String(record.response || "{}"))?.progress || null;
  } catch {
    return null;
  }
}

@Injectable()
export class InteractiveStoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildStoryFilter(access: StoryAccessContext): Prisma.InteractiveStoryWhereInput {
    return {
      isPublished: true,
    };
  }

  private isStoryVisibleInAccess(story: StoryWithGraph, access: StoryAccessContext) {
    return access.includeAdult
      ? normalizeContentMode(story.contentMode) === "ADULT"
      : normalizeContentMode(story.contentMode) === "NORMAL";
  }

  private buildStoryFromSnapshot(record: any): StoryWithGraph | null {
    const raw = record?.publishedSnapshots?.[0]?.snapshotJson || null;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }

    const snapshot = raw as Record<string, any>;
    const storyPayload = snapshot.story || {};
    const nodesPayload = Array.isArray(snapshot.nodes) ? snapshot.nodes : [];
    const seriesPayload = snapshot.series || record.series || null;

    const nodes = nodesPayload.map((node) => ({
      ...node,
      storyId: normalizeText(node.storyId || record.id),
      nodeKey: normalizeText(node.nodeKey),
      title: normalizeText(node.title),
      baseContext: normalizeNullableText(node.baseContext),
      basePrompt: normalizeNullableText(node.basePrompt),
      fallbackText: normalizeNullableText(node.fallbackText),
      generatedByAI: Boolean(node.generatedByAI),
      reviewStatus: normalizeReviewStatus(node.reviewStatus),
      editorNotes: normalizeNullableText(node.editorNotes),
      requiredFlags: parseStringArray(node.requiredFlags),
      blockedFlags: parseStringArray(node.blockedFlags),
      stateEffects: (node.stateEffects || {}) as Prisma.JsonValue,
      sortOrder: Number(node.sortOrder || 0),
      isEnding: Boolean(node.isEnding),
      aiEnabled: Boolean(node.aiEnabled),
      createdAt: node.createdAt ? new Date(node.createdAt) : new Date(0),
      updatedAt: node.updatedAt ? new Date(node.updatedAt) : new Date(0),
      choices: (Array.isArray(node.choices) ? node.choices : []).map((choice: any) => ({
        ...choice,
        nodeId: normalizeText(choice.nodeId || node.id),
        targetNodeId: normalizeNullableText(choice.targetNodeId),
        choiceKey: normalizeText(choice.choiceKey),
        label: normalizeText(choice.label),
        description: normalizeNullableText(choice.description),
        unlockPolicy: normalizeUnlockPolicy(
          choice.unlockPolicy,
          Boolean(choice.requiresPremium),
          Math.max(0, Number(choice.requiresTokens || 0)),
        ),
        requiresPremium: Boolean(choice.requiresPremium),
        requiresTokens: Math.max(0, Number(choice.requiresTokens || 0)),
        unlockLabel: normalizeNullableText(choice.unlockLabel),
        requiredFlags: parseStringArray(choice.requiredFlags),
        blockedFlags: parseStringArray(choice.blockedFlags),
        stateEffects: (choice.stateEffects || {}) as Prisma.JsonValue,
        sortOrder: Number(choice.sortOrder || 0),
        createdAt: choice.createdAt ? new Date(choice.createdAt) : new Date(0),
        updatedAt: choice.updatedAt ? new Date(choice.updatedAt) : new Date(0),
        targetNode: null,
      })),
    })) as StoryGraphNode[];

    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
    for (const node of nodes) {
      for (const choice of node.choices) {
        choice.targetNode = choice.targetNodeId ? nodeById.get(choice.targetNodeId) || null : null;
      }
    }

    return {
      id: normalizeText(storyPayload.id || record.id),
      slug: normalizeText(storyPayload.slug || record.slug),
      title: normalizeText(storyPayload.title || record.title),
      description: normalizeNullableText(storyPayload.description ?? record.description),
      baseContext: normalizeNullableText(storyPayload.baseContext ?? record.baseContext),
      contentMode: normalizeContentMode(storyPayload.contentMode || record.contentMode),
      targetAudience: normalizeNullableText(storyPayload.targetAudience || record.targetAudience),
      seriesId: normalizeNullableText(storyPayload.seriesId || record.seriesId),
      initialNodeId: normalizeNullableText(storyPayload.initialNodeId),
      initialState: (storyPayload.initialState || record.initialState || {}) as Prisma.JsonValue,
      isPublished: Boolean(record.isPublished),
      publishedVersion: Number(storyPayload.publishedVersion || record.publishedVersion || 0),
      aiEnabled: Boolean(record.aiEnabled),
      series: seriesPayload
        ? {
            id: normalizeText(seriesPayload.id),
            title: normalizeText(seriesPayload.title),
            adult: Boolean(seriesPayload.adult),
            coverUrl: normalizeNullableText(seriesPayload.coverUrl),
            genres: parseStringArray(seriesPayload.genres),
          }
        : null,
      nodes,
    };
  }

  private async findStoryGraphBySlug(
    slug: string,
    access: StoryAccessContext,
  ): Promise<StoryWithGraph | null> {
    const record = (await this.prisma.interactiveStory.findFirst({
      where: {
        slug,
        ...this.buildStoryFilter(access),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        baseContext: true,
        contentMode: true,
        targetAudience: true,
        seriesId: true,
        initialNodeId: true,
        initialState: true,
        isPublished: true,
        publishedVersion: true,
        aiEnabled: true,
        publishedSnapshots: {
          where: { isActive: true },
          orderBy: [{ version: "desc" }],
          take: 1,
          select: {
            snapshotJson: true,
            version: true,
            publishedAt: true,
          },
        },
        series: {
          select: {
            id: true,
            title: true,
            adult: true,
            coverUrl: true,
            genres: true,
          },
        },
      },
    })) as any;

    if (!record) {
      return null;
    }
    const story = this.buildStoryFromSnapshot(record);
    if (!story || !this.isStoryVisibleInAccess(story, access)) {
      return null;
    }
    return story;
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
    node: StoryGraphNode,
    approvedNodeById: Map<string, StoryGraphNode>,
  ) {
    return (node.choices || []).filter((choice) => {
      const targetNodeId = normalizeText(choice.targetNodeId);
      return Boolean(targetNodeId && approvedNodeById.has(targetNodeId));
    });
  }

  private getSelectableChoices(node: StoryGraphNode) {
    return (node.choices || []).filter((choice) => Boolean(normalizeText(choice.targetNodeId)));
  }

  private isChoiceAvailable(choice: InteractiveStoryChoice, flags: string[]): boolean {
    const currentFlags = new Set(flags.map((item) => normalizeText(item)));
    const required = parseStringArray(choice.requiredFlags);
    const blocked = parseStringArray(choice.blockedFlags);
    return required.every((flag) => currentFlags.has(flag)) &&
      !blocked.some((flag) => currentFlags.has(flag));
  }

  private async getUnlockContext(userId: string, storyId: string): Promise<UnlockContext> {
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
      unlockedChoiceIds: new Set(
        unlocks.map((item: { choiceId: string }) => normalizeText(item.choiceId)),
      ),
    };
  }

  private getLockedReason(
    choice: InteractiveStoryChoice & { unlockPolicy?: UnlockPolicy },
    unlockContext?: UnlockContext,
  ): string | null {
    const choiceId = normalizeText(choice.id);
    if (unlockContext?.unlockedChoiceIds.has(choiceId)) {
      return null;
    }

    const policy = normalizeUnlockPolicy(
      choice.unlockPolicy,
      Boolean(choice.requiresPremium),
      Math.max(0, Number(choice.requiresTokens || 0)),
    );
    const hasPremium = Boolean(unlockContext?.subscription?.active);
    const tokensRequired = Math.max(0, Number(choice.requiresTokens || 0));
    const tokenBalance =
      Number(unlockContext?.wallet?.paidPts || 0) +
      Number(unlockContext?.wallet?.bonusPts || 0);
    const hasTokens = tokenBalance >= tokensRequired;

    switch (policy) {
      case "FREE":
        return null;
      case "PREMIUM_ONLY":
        return hasPremium ? null : "PREMIUM_REQUIRED";
      case "TOKENS_ONLY":
        return hasTokens ? null : "TOKENS_REQUIRED";
      case "PREMIUM_OR_TOKENS":
        return hasPremium || hasTokens ? null : "TOKENS_REQUIRED";
      case "PREMIUM_AND_TOKENS":
        if (!hasPremium) return "PREMIUM_REQUIRED";
        return hasTokens ? null : "TOKENS_REQUIRED";
      default:
        return null;
    }
  }

  private toChoiceView(
    choices: Array<InteractiveStoryChoice & { unlockPolicy?: UnlockPolicy }>,
    flags: string[],
    unlockContext?: UnlockContext,
  ): StoryChoiceView[] {
    return choices
      .filter((choice) => this.isChoiceAvailable(choice, flags))
      .slice(0, 4)
      .map((choice) => {
        const unlockPolicy = normalizeUnlockPolicy(
          choice.unlockPolicy,
          Boolean(choice.requiresPremium),
          Math.max(0, Number(choice.requiresTokens || 0)),
        );
        const lockedReason = this.getLockedReason(choice, unlockContext);
        return {
          id: choice.id,
          key: choice.choiceKey,
          label: normalizeText(choice.label),
          description: normalizeText(choice.description),
          unlockPolicy,
          requiresPremium: Boolean(choice.requiresPremium),
          requiresTokens: Math.max(0, Number(choice.requiresTokens || 0)),
          unlockLabel: normalizeNullableText(choice.unlockLabel),
          locked: Boolean(lockedReason),
          lockedReason,
          unlocked: Boolean(unlockContext?.unlockedChoiceIds.has(normalizeText(choice.id))),
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
    approvedNodeById: Map<string, StoryGraphNode>,
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
    node: StoryGraphNode;
    state: StoryState;
    flags: string[];
    generatedText: string | null;
    pathNodeIds: string[];
    endingsReached: string[];
    approvedChoices: Array<InteractiveStoryChoice & { unlockPolicy?: UnlockPolicy }>;
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
        choices: this.toChoiceView(params.approvedChoices, params.flags, params.unlockContext),
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

  private async buildStoryProgress(
    story: StoryWithGraph,
    userId: string,
    progressRow?: { currentNodeId: string; lastGeneratedText: string | null } | null,
    stateRow?: { state: Prisma.JsonValue | null; flags: string[] } | null,
  ): Promise<StoryProgressView | null> {
    if (!story || this.getApprovedNodes(story).length === 0) {
      return null;
    }
    const approvedNodeById = this.buildApprovedNodeById(story);
    const startNode = this.getStartNode(story);
    if (!startNode) {
      return null;
    }

    const state = parseState(stateRow?.state || story.initialState);
    const flags = mergeFlags(state, parseStringArray(stateRow?.flags || []));
    state.flags = flags;
    const currentNode = approvedNodeById.get(progressRow?.currentNodeId || "") || startNode;
    const pathNodeIds = parsePathNodeIds(state.pathNodeIds).length
      ? parsePathNodeIds(state.pathNodeIds)
      : [startNode.id];
    const endingsReached = parseStringArray(state.endingsReached);
    const unlockContext = await this.getUnlockContext(userId, story.id);

    return this.toProgressView({
      story,
      node: currentNode,
      state,
      flags,
      generatedText:
        progressRow?.lastGeneratedText ||
        normalizeText(currentNode.fallbackText || currentNode.baseContext) ||
        null,
      pathNodeIds,
      endingsReached,
      approvedChoices: this.getApprovedChoices(currentNode, approvedNodeById),
      unlockContext,
    });
  }

  async listStories(access: StoryAccessContext): Promise<StorySummaryView[]> {
    const records = await this.prisma.interactiveStory.findMany({
      where: this.buildStoryFilter(access),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        baseContext: true,
        contentMode: true,
        targetAudience: true,
        seriesId: true,
        initialNodeId: true,
        initialState: true,
        isPublished: true,
        publishedVersion: true,
        aiEnabled: true,
        publishedSnapshots: {
          where: { isActive: true },
          orderBy: [{ version: "desc" }],
          take: 1,
          select: {
            snapshotJson: true,
            version: true,
            publishedAt: true,
          },
        },
        series: {
          select: {
            id: true,
            title: true,
            adult: true,
            coverUrl: true,
            genres: true,
          },
        },
      },
    });

    return records
      .map((record) => this.buildStoryFromSnapshot(record))
      .filter((story) => Boolean(story) && this.isStoryVisibleInAccess(story as StoryWithGraph, access))
      .map((story) => this.ensureSeriesCompatibility(story as StoryWithGraph))
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
        isPublished: true,
      },
      select: { slug: true },
    });
    if (!stub?.slug) {
      return null;
    }

    const story = this.ensureSeriesCompatibility(await this.findStoryGraphBySlug(stub.slug, access));
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

    const story = this.ensureSeriesCompatibility(await this.findStoryGraphBySlug(normalizedSlug, access));
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
    const story = this.ensureSeriesCompatibility(await this.findStoryGraphBySlug(normalizeText(storySlug), access));
    if (!story || this.getApprovedNodes(story).length === 0) {
      return null;
    }

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

    if (!progressRow || !stateRow) {
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

      return this.buildStoryProgress(
        story,
        userId,
        {
          currentNodeId: startNode.id,
          lastGeneratedText: normalizeText(startNode.fallbackText || startNode.baseContext),
        },
        {
          state: nextState as Prisma.JsonValue,
          flags,
        },
      );
    }

    return this.buildStoryProgress(story, userId, progressRow, stateRow);
  }

  async getBulkProgress(
    storySlugs: string[],
    userId: string,
    access: StoryAccessContext,
  ): Promise<StoryProgressView[]> {
    const normalizedSlugs = [...new Set((Array.isArray(storySlugs) ? storySlugs : []).map((item) => normalizeText(item)).filter(Boolean))];
    if (normalizedSlugs.length === 0) {
      return [];
    }

    const stories = (await Promise.all(
      normalizedSlugs.map((slug) => this.findStoryGraphBySlug(slug, access)),
    ))
      .map((story) => this.ensureSeriesCompatibility(story))
      .filter(Boolean) as StoryWithGraph[];

    if (stories.length === 0) {
      return [];
    }

    const storyIds = stories.map((story) => story.id);
    const [progressRows, stateRows] = await Promise.all([
      this.prisma.userStoryProgress.findMany({
        where: { userId, storyId: { in: storyIds } },
      }),
      this.prisma.userStoryState.findMany({
        where: { userId, storyId: { in: storyIds } },
      }),
    ]);
    const progressByStoryId = new Map(progressRows.map((row) => [row.storyId, row] as const));
    const stateByStoryId = new Map(stateRows.map((row) => [row.storyId, row] as const));

    const items = await Promise.all(
      stories.map((story) =>
        this.buildStoryProgress(
          story,
          userId,
          progressByStoryId.get(story.id) || null,
          stateByStoryId.get(story.id) || null,
        ),
      ),
    );
    return items.filter(Boolean) as StoryProgressView[];
  }

  async restartProgress(
    storySlug: string,
    userId: string,
    access: StoryAccessContext,
  ): Promise<StoryProgressView | null> {
    const story = this.ensureSeriesCompatibility(await this.findStoryGraphBySlug(normalizeText(storySlug), access));
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

    return this.buildStoryProgress(
      story,
      userId,
      {
        currentNodeId: startNode.id,
        lastGeneratedText: normalizeText(startNode.fallbackText || startNode.baseContext),
      },
      {
        state: nextState as Prisma.JsonValue,
        flags,
      },
    );
  }

  private buildChoiceScope(
    input: SubmitChoiceInput,
    storyId: string,
    fromNodeId: string,
  ): ChoiceScope {
    const requestKey = normalizeText(input.idempotencyKey);
    if (!requestKey) {
      throw new Error("interactive choice submit requires a non-empty idempotency key");
    }
    const scope = {
      operation: "interactive_choice_submit",
      userId: normalizeText(input.userId),
      storyId: normalizeText(storyId),
      fromNodeId: normalizeText(fromNodeId),
      choiceId: normalizeText(input.choiceId),
      requestKey,
    };
    if (!scope.userId || !scope.storyId || !scope.fromNodeId || !scope.choiceId) {
      throw new Error("interactive choice submit requires a fully scoped idempotency key");
    }
    return scope;
  }

  private async readScopedReplay(scope: ChoiceScope) {
    const now = Date.now();
    const record = (await this.prisma.idempotencyKey.findUnique({
      where: { scopedKey: buildScopedKey(scope) },
      select: {
        state: true,
        body: true,
        response: true,
        expiresAt: true,
      },
    })) as any;

    if (record && record.expiresAt.getTime() > now && record.state === "completed") {
      return parseReplayPayload(record);
    }
    return null;
  }

  private async readChoiceReplayByRequest(params: {
    userId: string;
    storyId: string;
    choiceId: string;
    requestKey: string;
  }) {
    const requestKey = normalizeText(params.requestKey);
    const choiceId = normalizeText(params.choiceId);
    if (!requestKey || !choiceId) {
      return null;
    }

    const record = (await this.prisma.idempotencyKey.findFirst({
      where: {
        operation: "interactive_choice_submit",
        userId: params.userId,
        storyId: params.storyId,
        fromNodeId: { not: null },
        choiceId,
        requestKey,
        state: "completed",
        expiresAt: { gt: new Date() },
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        body: true,
        response: true,
      },
    })) as any;

    if (!record) {
      return null;
    }
    return parseReplayPayload(record);
  }

  private buildUnlockDecision(
    choice: InteractiveStoryChoice & { unlockPolicy?: UnlockPolicy },
    unlockContext: UnlockContext,
  ) {
    const policy = normalizeUnlockPolicy(
      choice.unlockPolicy,
      Boolean(choice.requiresPremium),
      Math.max(0, Number(choice.requiresTokens || 0)),
    );
    const choiceId = normalizeText(choice.id);
    if (unlockContext.unlockedChoiceIds.has(choiceId)) {
      return { ok: true as const, tokensToCharge: 0, unlockType: "already_unlocked" };
    }

    const hasPremium = Boolean(unlockContext.subscription?.active);
    const tokensRequired = Math.max(0, Number(choice.requiresTokens || 0));
    const tokenBalance =
      Number(unlockContext.wallet?.paidPts || 0) +
      Number(unlockContext.wallet?.bonusPts || 0);
    const hasTokens = tokenBalance >= tokensRequired;

    switch (policy) {
      case "FREE":
        return { ok: true as const, tokensToCharge: 0, unlockType: "free" };
      case "PREMIUM_ONLY":
        return hasPremium
          ? { ok: true as const, tokensToCharge: 0, unlockType: "premium" }
          : { ok: false as const, reason: "PREMIUM_REQUIRED" as const };
      case "TOKENS_ONLY":
        return hasTokens
          ? { ok: true as const, tokensToCharge: tokensRequired, unlockType: "tokens" }
          : { ok: false as const, reason: "TOKENS_REQUIRED" as const };
      case "PREMIUM_OR_TOKENS":
        if (hasPremium) {
          return { ok: true as const, tokensToCharge: 0, unlockType: "premium_or_tokens" };
        }
        return hasTokens
          ? {
              ok: true as const,
              tokensToCharge: tokensRequired,
              unlockType: "premium_or_tokens",
            }
          : { ok: false as const, reason: "TOKENS_REQUIRED" as const };
      case "PREMIUM_AND_TOKENS":
        if (!hasPremium) {
          return { ok: false as const, reason: "PREMIUM_REQUIRED" as const };
        }
        return hasTokens
          ? {
              ok: true as const,
              tokensToCharge: tokensRequired,
              unlockType: "premium_and_tokens",
            }
          : { ok: false as const, reason: "TOKENS_REQUIRED" as const };
      default:
        return { ok: true as const, tokensToCharge: 0, unlockType: "free" };
    }
  }

  private async unlockWithinTransaction(params: {
    tx: Prisma.TransactionClient;
    userId: string;
    storyId: string;
    choice: InteractiveStoryChoice & { unlockPolicy?: UnlockPolicy };
    unlockContext: UnlockContext;
  }) {
    const decision = this.buildUnlockDecision(params.choice, params.unlockContext);
    if (!decision.ok) {
      return decision;
    }
    const choiceId = normalizeText(params.choice.id);
    if (decision.unlockType === "free" || decision.unlockType === "already_unlocked") {
      return { ok: true as const };
    }

    const existingUnlock = await params.tx.userInteractiveChoiceUnlock.findUnique({
      where: {
        userId_choiceId: {
          userId: params.userId,
          choiceId: params.choice.id,
        },
      },
    });
    if (existingUnlock) {
      params.unlockContext.unlockedChoiceIds.add(choiceId);
      return { ok: true as const };
    }

    if (decision.tokensToCharge > 0) {
      const walletRow = await params.tx.wallet.findUnique({
        where: { userId: params.userId },
      });
      const chargeResult = chargeWallet(
        walletRow || params.unlockContext.wallet || { paidPts: 0, bonusPts: 0, userId: params.userId, plan: "free" },
        decision.tokensToCharge,
      );
      if (!chargeResult.ok) {
        return { ok: false as const, reason: "TOKENS_REQUIRED" as const };
      }
      const updatedWallet = await params.tx.wallet.upsert({
        where: { userId: params.userId },
        update: {
          paidPts: chargeResult.wallet.paidPts || 0,
          bonusPts: chargeResult.wallet.bonusPts || 0,
        },
        create: {
          userId: params.userId,
          paidPts: chargeResult.wallet.paidPts || 0,
          bonusPts: chargeResult.wallet.bonusPts || 0,
          plan: params.unlockContext.wallet?.plan || "free",
        },
      });
      params.unlockContext.wallet = {
        userId: normalizeText(updatedWallet.userId),
        paidPts: Number(updatedWallet.paidPts || 0),
        bonusPts: Number(updatedWallet.bonusPts || 0),
        plan: normalizeText(updatedWallet.plan || "free") || "free",
      };
    }

    await params.tx.userInteractiveChoiceUnlock.create({
      data: {
        userId: params.userId,
        storyId: params.storyId,
        choiceId: params.choice.id,
        unlockType: decision.unlockType,
        tokensPaid: decision.tokensToCharge,
      },
    });
    params.unlockContext.unlockedChoiceIds.add(choiceId);
    return { ok: true as const };
  }

  private async resolveChoice(
    input: SubmitChoiceInput,
    access: StoryAccessContext,
  ): Promise<
    | {
        ok: true;
        story: StoryWithGraph;
        approvedNodeById: Map<string, StoryGraphNode>;
        startNode: StoryGraphNode;
        currentNode: StoryGraphNode;
        selectedChoice: StoryGraphNode["choices"][number];
        nextNode: StoryGraphNode;
        progressRow: any;
        stateRow: any;
        stateBefore: StoryState;
        flagsBefore: string[];
        pathBefore: string[];
        endingsReachedBefore: string[];
        unlockContext: UnlockContext;
      }
    | { ok: false; reason: ChoiceResultReason }
  > {
    const normalizedChoiceId = normalizeText(input.choiceId);
    if (!normalizedChoiceId) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const story = this.ensureSeriesCompatibility(await this.findStoryGraphBySlug(normalizeText(input.storySlug), access));
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
    const selectedChoice = this.getSelectableChoices(currentNode).find(
      (choice) => choice.id === normalizedChoiceId,
    );
    if (!selectedChoice || !this.isChoiceAvailable(selectedChoice, flagsBefore)) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }

    const nextNode = approvedNodeById.get(normalizeText(selectedChoice.targetNodeId));
    if (!nextNode || normalizeReviewStatus(nextNode.reviewStatus) !== "approved") {
      return { ok: false, reason: "TARGET_NODE_NOT_AVAILABLE" };
    }

    const unlockCheck = this.buildUnlockDecision(selectedChoice, unlockContext);
    if (!unlockCheck.ok) {
      return { ok: false, reason: unlockCheck.reason };
    }

    return {
      ok: true,
      story,
      approvedNodeById,
      startNode,
      currentNode,
      selectedChoice,
      nextNode,
      progressRow,
      stateRow,
      stateBefore,
      flagsBefore,
      pathBefore,
      endingsReachedBefore,
      unlockContext,
    };
  }

  async unlockChoice(
    input: SubmitChoiceInput,
    access: StoryAccessContext,
  ): Promise<
    | { ok: true; progress: StoryProgressView; unlockedChoiceId: string }
    | { ok: false; reason: ChoiceResultReason }
  > {
    const resolved = await this.resolveChoice(input, access);
    if (!resolved.ok) {
      return resolved;
    }

    const unlockResult = await this.prisma.$transaction(async (tx) =>
      this.unlockWithinTransaction({
        tx,
        userId: input.userId,
        storyId: resolved.story.id,
        choice: resolved.selectedChoice,
        unlockContext: resolved.unlockContext,
      }),
    );
    if (!unlockResult.ok) {
      return unlockResult;
    }

    const progress = await this.buildStoryProgress(
      resolved.story,
      input.userId,
      resolved.progressRow || {
        currentNodeId: resolved.currentNode.id,
        lastGeneratedText: normalizeText(
          resolved.currentNode.fallbackText || resolved.currentNode.baseContext,
        ),
      },
      resolved.stateRow || {
        state: resolved.stateBefore as Prisma.JsonValue,
        flags: resolved.flagsBefore,
      },
    );
    if (!progress) {
      return { ok: false, reason: "INVALID_CHOICE" };
    }
    return {
      ok: true,
      progress,
      unlockedChoiceId: resolved.selectedChoice.id,
    };
  }

  async submitChoice(
    input: SubmitChoiceInput,
    access: StoryAccessContext,
  ): Promise<
    | { ok: true; progress: StoryProgressView; replay?: boolean }
    | { ok: false; reason: ChoiceResultReason }
  > {
    const replayStory = this.ensureSeriesCompatibility(
      await this.findStoryGraphBySlug(normalizeText(input.storySlug), access),
    );
    if (replayStory) {
      const replay = await this.readChoiceReplayByRequest({
        userId: input.userId,
        storyId: replayStory.id,
        choiceId: input.choiceId,
        requestKey: normalizeText(input.idempotencyKey),
      });
      if (replay) {
        return { ok: true, progress: replay, replay: true };
      }
    }

    const resolved = await this.resolveChoice(input, access);
    if (!resolved.ok) {
      return resolved;
    }

    const scope = this.buildChoiceScope(input, resolved.story.id, resolved.currentNode.id);
    const replay = await this.readScopedReplay(scope);
    if (replay) {
      return { ok: true, progress: replay, replay: true };
    }

    const nextState = applyEffects(
      applyEffects(resolved.stateBefore, resolved.selectedChoice.stateEffects),
      resolved.nextNode.stateEffects,
    );
    const nextFlags = mergeFlags(nextState, parseStringArray(nextState.flags));
    nextState.flags = nextFlags;
    nextState.pathNodeIds = [...resolved.pathBefore, resolved.nextNode.id];
    nextState.endingsReached = resolved.nextNode.isEnding
      ? [...new Set([...resolved.endingsReachedBefore, resolved.nextNode.id])]
      : resolved.endingsReachedBefore;
    const generatedText = normalizeText(
      resolved.nextNode.fallbackText || resolved.nextNode.baseContext,
    );
    const now = new Date();
    const scopedKey = buildScopedKey(scope);

    const result = await this.prisma.$transaction(async (tx) => {
      if (typeof (tx as Prisma.TransactionClient & { $queryRawUnsafe?: Function }).$queryRawUnsafe === "function") {
        await (tx as Prisma.TransactionClient & { $queryRawUnsafe: Function }).$queryRawUnsafe(
          "SELECT 1 FROM pg_advisory_xact_lock(hashtext($1))",
          scopedKey,
        );
      }

      const existingRecord = (await tx.idempotencyKey.findUnique({
        where: { scopedKey },
        select: {
          scopedKey: true,
          state: true,
          body: true,
          response: true,
          expiresAt: true,
        },
      })) as any;

      if (existingRecord && existingRecord.expiresAt.getTime() > Date.now()) {
        if (existingRecord.state === "completed") {
          const replayProgress = parseReplayPayload(existingRecord);
          if (replayProgress) {
            return {
              replay: replayProgress as StoryProgressView,
            };
          }
          return { ok: false as const, reason: "INVALID_CHOICE" as const };
        }
        return { ok: false as const, reason: "INVALID_CHOICE" as const };
      }

      await tx.idempotencyKey.upsert({
        where: { scopedKey },
        update: {
          userId: scope.userId,
          operation: scope.operation,
          storyId: scope.storyId,
          fromNodeId: scope.fromNodeId,
          choiceId: scope.choiceId,
          requestKey: scope.requestKey,
          state: "processing",
          status: null,
          body: Prisma.JsonNull,
          response: null,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
        create: {
          scopedKey,
          userId: scope.userId,
          operation: scope.operation,
          storyId: scope.storyId,
          fromNodeId: scope.fromNodeId,
          choiceId: scope.choiceId,
          requestKey: scope.requestKey,
          state: "processing",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      const unlockResult = await this.unlockWithinTransaction({
        tx,
        userId: input.userId,
        storyId: resolved.story.id,
        choice: resolved.selectedChoice,
        unlockContext: resolved.unlockContext,
      });
      if (!unlockResult.ok) {
        return unlockResult;
      }

      await tx.userStoryProgress.upsert({
        where: {
          userId_storyId: {
            userId: input.userId,
            storyId: resolved.story.id,
          },
        },
        update: {
          currentNodeId: resolved.nextNode.id,
          lastChoiceId: resolved.selectedChoice.id,
          lastChoiceAt: now,
          lastGeneratedText: generatedText,
          updatedAt: now,
        },
        create: {
          userId: input.userId,
          storyId: resolved.story.id,
          currentNodeId: resolved.nextNode.id,
          lastChoiceId: resolved.selectedChoice.id,
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
            storyId: resolved.story.id,
          },
        },
        update: {
          state: toInputJson(nextState),
          flags: nextFlags,
          updatedAt: now,
        },
        create: {
          userId: input.userId,
          storyId: resolved.story.id,
          state: toInputJson(nextState),
          flags: nextFlags,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.userStoryChoiceLog.create({
        data: {
          userId: input.userId,
          storyId: resolved.story.id,
          nodeId: resolved.currentNode.id,
          choiceId: resolved.selectedChoice.id,
          targetNodeId: resolved.nextNode.id,
          stateBefore: toInputJson(resolved.stateBefore),
          stateAfter: toInputJson(nextState),
          createdAt: now,
        },
      });

      const progress = this.toProgressView({
        story: resolved.story,
        node: resolved.nextNode,
        state: nextState,
        flags: nextFlags,
        generatedText,
        pathNodeIds: parsePathNodeIds(nextState.pathNodeIds),
        endingsReached: parseStringArray(nextState.endingsReached),
        approvedChoices: this.getApprovedChoices(
          resolved.nextNode,
          resolved.approvedNodeById,
        ),
        unlockContext: resolved.unlockContext,
      });

      const payload = { progress };
      await tx.idempotencyKey.update({
        where: { scopedKey },
        data: {
          state: "completed",
          status: 200,
          body: payload as Prisma.InputJsonValue,
          response: JSON.stringify(payload),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      return { ok: true as const, progress };
    });

    if ("replay" in result && result.replay) {
      return { ok: true, progress: result.replay, replay: true };
    }
    if (!result.ok) {
      return result;
    }
    return { ok: true, progress: result.progress };
  }
}
