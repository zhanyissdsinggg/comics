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

type StoryNodeInput = {
  nodeKey: string;
  isEnding?: boolean;
  choices?: Array<{
    choiceKey: string;
    targetNodeId?: string | null;
  }>;
};

type StoryInput = {
  id: string;
  initialNodeId?: string | null;
  nodes?: StoryNodeInput[];
};

function normalizeText(value: unknown): string {
  return String(value || "").trim();
}

export function validateInteractiveStoryGraph(story: StoryInput): InteractiveStoryValidationResult {
  const issues: InteractiveStoryValidationIssue[] = [];
  const nodes = Array.isArray(story?.nodes) ? story.nodes : [];

  if (!story?.id) {
    issues.push({
      code: "STORY_ID_MISSING",
      severity: "error",
      message: "Story id is missing",
    });
  }

  if (nodes.length === 0) {
    issues.push({
      code: "NODES_EMPTY",
      severity: "error",
      message: "Interactive story must contain at least one node",
    });
  }

  const nodeIdSet = new Set<string>();
  const nodeKeySet = new Set<string>();
  const incomingByNodeId = new Map<string, number>();

  for (const node of nodes) {
    const nodeKey = normalizeText(node?.nodeKey);
    if (!nodeKey) {
      issues.push({
        code: "NODE_KEY_MISSING",
        severity: "error",
        message: "Node key is required",
      });
      continue;
    }
    if (nodeKeySet.has(nodeKey)) {
      issues.push({
        code: "NODE_KEY_DUPLICATED",
        severity: "error",
        message: `Duplicated node key: ${nodeKey}`,
        nodeKey,
      });
    }
    nodeKeySet.add(nodeKey);
  }

  for (const node of nodes as Array<StoryNodeInput & { id?: string }>) {
    const nodeId = normalizeText((node as any)?.id);
    if (nodeId) {
      nodeIdSet.add(nodeId);
      incomingByNodeId.set(nodeId, 0);
    }
  }

  const initialNodeId = normalizeText(story?.initialNodeId || "");
  if (initialNodeId && !nodeIdSet.has(initialNodeId)) {
    issues.push({
      code: "INITIAL_NODE_NOT_FOUND",
      severity: "error",
      message: "initialNodeId does not exist in story nodes",
    });
  }

  for (const node of nodes) {
    const nodeKey = normalizeText(node?.nodeKey);
    const choices = Array.isArray(node?.choices) ? node.choices : [];

    if (!node?.isEnding && choices.length === 0) {
      issues.push({
        code: "NODE_NO_CHOICES",
        severity: "warning",
        message: `Non-ending node has no choices: ${nodeKey}`,
        nodeKey,
      });
    }

    for (const choice of choices) {
      const choiceKey = normalizeText(choice?.choiceKey);
      if (!choiceKey) {
        issues.push({
          code: "CHOICE_KEY_MISSING",
          severity: "error",
          message: `Choice key is required in node ${nodeKey}`,
          nodeKey,
        });
      }

      const targetNodeId = normalizeText(choice?.targetNodeId || "");
      if (!targetNodeId) {
        issues.push({
          code: "CHOICE_TARGET_MISSING",
          severity: "warning",
          message: `Choice has no target node: ${nodeKey}.${choiceKey}`,
          nodeKey,
          choiceKey,
        });
      } else if (!nodeIdSet.has(targetNodeId)) {
        issues.push({
          code: "CHOICE_TARGET_NOT_FOUND",
          severity: "error",
          message: `Choice target node does not exist: ${nodeKey}.${choiceKey}`,
          nodeKey,
          choiceKey,
        });
      } else {
        incomingByNodeId.set(targetNodeId, (incomingByNodeId.get(targetNodeId) || 0) + 1);
      }
    }
  }

  const rootCandidates = [...incomingByNodeId.entries()]
    .filter(([nodeId, incoming]) => incoming === 0 && nodeId !== initialNodeId)
    .map(([nodeId]) => nodeId);
  if (rootCandidates.length > 0) {
    issues.push({
      code: "UNREACHABLE_ROOTS",
      severity: "warning",
      message: `Found ${rootCandidates.length} node(s) without incoming edge`,
    });
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

