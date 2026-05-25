export const emptyStory = () => ({
  slug: "",
  title: "",
  seriesId: "",
  description: "",
  coverImage: "",
  genre: "",
  targetAudience: "",
  contentMode: "normal",
  status: "draft",
  baseContext: "",
  initialStateText: "",
  isPublished: false,
  aiEnabled: true,
});

export const emptyNode = () => ({
  nodeKey: "",
  title: "",
  body: "",
  imageUrl: "",
  endingType: "",
  orderIndex: 0,
  sortOrder: 0,
  baseContext: "",
  basePrompt: "",
  fallbackText: "",
  requiredFlagsText: "",
  blockedFlagsText: "",
  stateEffectsText: "",
  isEnding: false,
  aiEnabled: true,
  generatedByAI: false,
  reviewStatus: "approved",
  editorNotes: "",
});

export const emptyChoice = () => ({
  choiceKey: "",
  label: "",
  description: "",
  targetNodeId: "",
  requiresPremium: false,
  requiresTokens: 0,
  orderIndex: 0,
  sortOrder: 0,
  requiredFlagsText: "",
  blockedFlagsText: "",
  stateEffectsText: "",
});

export function formatStringList(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : "";
}

export function parseStringList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatJson(value) {
  if (
    !value ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0)
  ) {
    return "";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export function parseJsonText(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    return {};
  }
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid");
    }
    return parsed;
  } catch {
    throw new Error(`${label} must be a valid JSON object`);
  }
}

export function normalizeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function summarizeStateKeys(stateText) {
  try {
    const parsed = parseJsonText(stateText, "State JSON");
    return Object.keys(parsed);
  } catch {
    return [];
  }
}

export function mapStoryToForm(next) {
  return {
    slug: next?.slug || "",
    title: next?.title || "",
    seriesId: next?.seriesId || "",
    description: next?.description || "",
    coverImage: next?.coverImage || "",
    genre: next?.genre || "",
    targetAudience: next?.targetAudience || "",
    contentMode: next?.contentMode || "normal",
    status: next?.status || (next?.isPublished ? "published" : "draft"),
    baseContext: next?.baseContext || "",
    initialStateText: formatJson(next?.initialState),
    isPublished: Boolean(next?.isPublished),
    aiEnabled: Boolean(next?.aiEnabled),
  };
}

export function mapNodeToForm(node) {
  return {
    nodeKey: node?.nodeKey || "",
    title: node?.title || "",
    body: node?.body || "",
    imageUrl: node?.imageUrl || "",
    endingType: node?.endingType || "",
    orderIndex: Number(node?.orderIndex ?? node?.sortOrder ?? 0),
    sortOrder: Number(node?.sortOrder || 0),
    baseContext: node?.baseContext || "",
    basePrompt: node?.basePrompt || "",
    fallbackText: node?.fallbackText || "",
    requiredFlagsText: formatStringList(node?.requiredFlags),
    blockedFlagsText: formatStringList(node?.blockedFlags),
    stateEffectsText: formatJson(node?.stateEffects),
    isEnding: Boolean(node?.isEnding),
    aiEnabled: Boolean(node?.aiEnabled),
    generatedByAI: Boolean(node?.generatedByAI),
    reviewStatus: node?.reviewStatus || "approved",
    editorNotes: node?.editorNotes || "",
  };
}

export function mapChoiceToForm(choice) {
  return {
    choiceKey: choice?.choiceKey || "",
    label: choice?.label || "",
    description: choice?.description || "",
    targetNodeId: choice?.targetNodeId || "",
    requiresPremium: Boolean(choice?.requiresPremium),
    requiresTokens: Number(choice?.requiresTokens || 0),
    orderIndex: Number(choice?.orderIndex ?? choice?.sortOrder ?? 0),
    sortOrder: Number(choice?.sortOrder || 0),
    requiredFlagsText: formatStringList(choice?.requiredFlags),
    blockedFlagsText: formatStringList(choice?.blockedFlags),
    stateEffectsText: formatJson(choice?.stateEffects),
  };
}

export function mapPanelReviewToForm(panel) {
  return {
    finalImageUrl: panel?.finalImageUrl || panel?.imageUrl || "",
  };
}

export function compareFormState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
