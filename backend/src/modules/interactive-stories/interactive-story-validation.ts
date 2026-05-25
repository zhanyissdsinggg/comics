type ValidationSeverity = "error" | "warning";

export type InteractiveStoryValidationIssue = {
  code: string;
  severity: ValidationSeverity;
  message: string;
  nodeKey?: string;
  choiceKey?: string;
};

export type InteractiveStoryValidationResult = {
  ok: boolean;
  errors: number;
  warnings: number;
  issues: InteractiveStoryValidationIssue[];
};

type StoryChoiceInput = {
  id?: string;
  choiceKey?: string;
  label?: string;
  description?: string | null;
  targetNodeId?: string | null;
};

type StoryNodeInput = {
  id?: string;
  nodeKey?: string;
  title?: string;
  baseContext?: string | null;
  fallbackText?: string | null;
  isEnding?: boolean;
  choices?: StoryChoiceInput[];
};

type StoryInput = {
  id?: string;
  title?: string;
  description?: string | null;
  baseContext?: string | null;
  initialNodeId?: string | null;
  contentMode?: string | null;
  series?: {
    adult?: boolean | null;
    badges?: string[] | null;
    genres?: string[] | null;
  } | null;
  nodes?: StoryNodeInput[];
};

const ADULT_SIGNAL_REGEX =
  /\b(18\+|18 plus|adult|nsfw|explicit|smut|sexual|erotic|porn|fetish|mature|x-rated|r-18|r18|graphic violence)\b/i;

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeLower(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function pushIssue(
  issues: InteractiveStoryValidationIssue[],
  issue: InteractiveStoryValidationIssue,
) {
  issues.push(issue);
}

function hasAdultSignalsInText(value: unknown): boolean {
  const text = normalizeText(value);
  return Boolean(text) && ADULT_SIGNAL_REGEX.test(text);
}

function hasAdultSignalsInList(values: unknown): boolean {
  if (!Array.isArray(values)) {
    return false;
  }
  return values.some((item) => hasAdultSignalsInText(item));
}

export function validateInteractiveStoryGraph(
  story: StoryInput,
): InteractiveStoryValidationResult {
  const issues: InteractiveStoryValidationIssue[] = [];
  const nodes = Array.isArray(story?.nodes) ? story.nodes : [];
  const contentMode = normalizeLower(story?.contentMode || "normal");

  if (!normalizeText(story?.id)) {
    pushIssue(issues, {
      code: "STORY_ID_MISSING",
      severity: "error",
      message: "Story id is missing",
    });
  }

  if (contentMode !== "normal" && contentMode !== "adult") {
    pushIssue(issues, {
      code: "CONTENT_MODE_INVALID",
      severity: "error",
      message: "Interactive story contentMode must be NORMAL or ADULT",
    });
  }

  if (nodes.length === 0) {
    pushIssue(issues, {
      code: "NODES_EMPTY",
      severity: "error",
      message: "Interactive story must contain at least one node",
    });
  }

  const nodeIdSet = new Set<string>();
  const nodeKeySet = new Set<string>();
  const nodeById = new Map<string, StoryNodeInput>();
  const reachableNodeIds = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    const nodeId = normalizeText(node?.id);
    const nodeKey = normalizeText(node?.nodeKey);

    if (!nodeKey) {
      pushIssue(issues, {
        code: "NODE_KEY_MISSING",
        severity: "error",
        message: "Node key is required",
      });
    } else if (nodeKeySet.has(nodeKey)) {
      pushIssue(issues, {
        code: "NODE_KEY_DUPLICATED",
        severity: "error",
        message: `Duplicated node key: ${nodeKey}`,
        nodeKey,
      });
    } else {
      nodeKeySet.add(nodeKey);
    }

    if (nodeId) {
      nodeIdSet.add(nodeId);
      nodeById.set(nodeId, node);
      adjacency.set(nodeId, []);
    }

    if (contentMode === "normal") {
      if (
        hasAdultSignalsInText(node?.title) ||
        hasAdultSignalsInText(node?.baseContext) ||
        hasAdultSignalsInText(node?.fallbackText)
      ) {
        pushIssue(issues, {
          code: "NORMAL_NODE_ADULT_CONTENT",
          severity: "error",
          message: `NORMAL story contains adult content signals in node ${nodeKey || nodeId || "unknown"}`,
          nodeKey: nodeKey || undefined,
        });
      }
    }
  }

  const initialNodeId = normalizeText(story?.initialNodeId);
  if (!initialNodeId) {
    pushIssue(issues, {
      code: "INITIAL_NODE_MISSING",
      severity: "error",
      message: "initialNodeId is required",
    });
  } else if (!nodeIdSet.has(initialNodeId)) {
    pushIssue(issues, {
      code: "INITIAL_NODE_NOT_FOUND",
      severity: "error",
      message: "initialNodeId does not exist in story nodes",
    });
  }

  for (const node of nodes) {
    const nodeId = normalizeText(node?.id);
    const nodeKey = normalizeText(node?.nodeKey);
    const choices = Array.isArray(node?.choices) ? node.choices : [];
    const nonEmptyChoices = choices.filter(
      (choice) => Boolean(normalizeText(choice?.choiceKey)),
    );

    if (node?.isEnding) {
      if (nonEmptyChoices.length > 0) {
        pushIssue(issues, {
          code: "ENDING_NODE_HAS_CHOICES",
          severity: "error",
          message: `Ending node should not expose normal choices: ${nodeKey}`,
          nodeKey: nodeKey || undefined,
        });
      }
    } else if (nonEmptyChoices.length < 2 || nonEmptyChoices.length > 4) {
      pushIssue(issues, {
        code: "NODE_CHOICE_COUNT_INVALID",
        severity: "error",
        message: `Non-ending node must have 2-4 choices: ${nodeKey}`,
        nodeKey: nodeKey || undefined,
      });
    }

    for (const choice of choices) {
      const choiceKey = normalizeText(choice?.choiceKey);
      if (!choiceKey) {
        pushIssue(issues, {
          code: "CHOICE_KEY_MISSING",
          severity: "error",
          message: `Choice key is required in node ${nodeKey || nodeId}`,
          nodeKey: nodeKey || undefined,
        });
      }

      const targetNodeId = normalizeText(choice?.targetNodeId);
      if (!targetNodeId) {
        pushIssue(issues, {
          code: "CHOICE_TARGET_MISSING",
          severity: "error",
          message: `Choice target is required: ${nodeKey}.${choiceKey || "unknown"}`,
          nodeKey: nodeKey || undefined,
          choiceKey: choiceKey || undefined,
        });
        continue;
      }

      if (!nodeIdSet.has(targetNodeId)) {
        pushIssue(issues, {
          code: "CHOICE_TARGET_NOT_FOUND",
          severity: "error",
          message: `Choice target node does not exist: ${nodeKey}.${choiceKey || "unknown"}`,
          nodeKey: nodeKey || undefined,
          choiceKey: choiceKey || undefined,
        });
        continue;
      }

      if (nodeId) {
        adjacency.get(nodeId)?.push(targetNodeId);
      }

      if (contentMode === "normal") {
        if (
          hasAdultSignalsInText(choice?.label) ||
          hasAdultSignalsInText(choice?.description)
        ) {
          pushIssue(issues, {
            code: "NORMAL_CHOICE_ADULT_CONTENT",
            severity: "error",
            message: `NORMAL story contains adult choice copy: ${nodeKey}.${choiceKey || "unknown"}`,
            nodeKey: nodeKey || undefined,
            choiceKey: choiceKey || undefined,
          });
        }
      }
    }
  }

  if (initialNodeId && nodeIdSet.has(initialNodeId)) {
    const queue = [initialNodeId];
    while (queue.length > 0) {
      const current = queue.shift() || "";
      if (!current || reachableNodeIds.has(current)) {
        continue;
      }
      reachableNodeIds.add(current);
      for (const targetId of adjacency.get(current) || []) {
        if (!reachableNodeIds.has(targetId)) {
          queue.push(targetId);
        }
      }
    }
  }

  for (const [nodeId, node] of nodeById.entries()) {
    if (!reachableNodeIds.has(nodeId)) {
      pushIssue(issues, {
        code: "NODE_UNREACHABLE",
        severity: "error",
        message: `Published node is not reachable from initial node: ${normalizeText(node?.nodeKey) || nodeId}`,
        nodeKey: normalizeText(node?.nodeKey) || undefined,
      });
    }
  }

  const reachableEndings = [...reachableNodeIds].filter((nodeId) =>
    Boolean(nodeById.get(nodeId)?.isEnding),
  );
  if (reachableNodeIds.size > 0 && reachableEndings.length === 0) {
    pushIssue(issues, {
      code: "REACHABLE_ENDING_MISSING",
      severity: "error",
      message: "Interactive story must have at least one reachable ending",
    });
  }

  if (contentMode === "normal") {
    if (story?.series?.adult) {
      pushIssue(issues, {
        code: "NORMAL_LINKED_ADULT_SERIES",
        severity: "error",
        message: "NORMAL story cannot be linked to an adult series",
      });
    }

    if (
      hasAdultSignalsInText(story?.title) ||
      hasAdultSignalsInText(story?.description) ||
      hasAdultSignalsInText(story?.baseContext) ||
      hasAdultSignalsInList(story?.series?.badges) ||
      hasAdultSignalsInList(story?.series?.genres)
    ) {
      pushIssue(issues, {
        code: "NORMAL_STORY_ADULT_CONTENT",
        severity: "error",
        message: "NORMAL story metadata contains adult content or adult tag signals",
      });
    }
  }

  const errors = issues.filter((item) => item.severity === "error").length;
  const warnings = issues.filter((item) => item.severity === "warning").length;

  return {
    ok: errors === 0,
    errors,
    warnings,
    issues,
  };
}
