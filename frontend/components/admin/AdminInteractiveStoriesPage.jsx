"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  ArrowRight,
  BookCopy,
  CheckCircle2,
  Copy,
  Download,
  FileJson,
  GitBranch,
  ListChecks,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import AdminShell from "./AdminShell";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/common/Modal";
import { useAdminAuth } from "./AuthContext";
import {
  AdminBadge,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  AdminTabs,
  adminCheckboxClassName,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "./common/AdminWorkspacePrimitives";
import { cn } from "@/lib/utils";
import {
  adminDelete,
  adminGet,
  adminPatch,
  adminPost,
} from "../../lib/adminApiClient";

const TABS = [
  { value: "story", label: "故事设定" },
  { value: "nodes", label: "节点编排" },
  { value: "json", label: "导入导出" },
];

const NODE_FILTERS = [
  { value: "all", label: "全部" },
  { value: "start", label: "起始" },
  { value: "ending", label: "结局" },
  { value: "withChoices", label: "有分支" },
  { value: "empty", label: "空分支" },
  { value: "dirty", label: "未保存" },
];

const emptyStory = () => ({
  slug: "",
  title: "",
  seriesId: "",
  description: "",
  baseContext: "",
  initialStateText: "",
  isPublished: false,
  aiEnabled: true,
});

const emptyNode = () => ({
  nodeKey: "",
  title: "",
  sortOrder: 0,
  baseContext: "",
  basePrompt: "",
  fallbackText: "",
  requiredFlagsText: "",
  blockedFlagsText: "",
  stateEffectsText: "",
  isEnding: false,
  aiEnabled: true,
});

const emptyChoice = () => ({
  choiceKey: "",
  label: "",
  description: "",
  targetNodeId: "",
  sortOrder: 0,
  requiredFlagsText: "",
  blockedFlagsText: "",
  stateEffectsText: "",
});

function msg(resp, fallback) {
  return String(
    resp?.error || resp?.message || resp?.data?.message || fallback || "",
  ).trim();
}

function exportJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatStringList(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : "";
}

function parseStringList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatJson(value) {
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

function parseJsonText(value, label) {
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
    throw new Error(`${label} 必须是合法的 JSON 对象`);
  }
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function summarizeStateKeys(stateText) {
  try {
    const parsed = parseJsonText(stateText, "状态 JSON");
    return Object.keys(parsed);
  } catch {
    return [];
  }
}

function getValidationTone(validation) {
  if (!validation) return "default";
  if (validation.errors > 0) return "danger";
  if (validation.warnings > 0) return "warning";
  return "success";
}

function formatValidationIssue(issue) {
  const code = String(issue?.code || "").trim();
  const nodeKey = String(issue?.nodeKey || "").trim();
  const choiceKey = String(issue?.choiceKey || "").trim();

  const templates = {
    STORY_ID_MISSING: () => "故事 ID 缺失",
    NODES_EMPTY: () => "至少需要 1 个剧情节点",
    NODE_KEY_MISSING: () => "节点 Key 必填",
    NODE_KEY_DUPLICATED: () =>
      nodeKey ? `节点 Key 重复：${nodeKey}` : "节点 Key 重复",
    INITIAL_NODE_NOT_FOUND: () => "起始节点 initialNodeId 未在节点列表中找到",
    NODE_NO_CHOICES: () =>
      nodeKey ? `非结局节点缺少选项：${nodeKey}` : "非结局节点缺少选项",
    CHOICE_KEY_MISSING: () =>
      nodeKey ? `选项 Key 缺失（节点：${nodeKey}）` : "选项 Key 缺失",
    CHOICE_TARGET_MISSING: () =>
      nodeKey
        ? `选项未配置目标节点：${nodeKey}${choiceKey ? `.${choiceKey}` : ""}`
        : "选项未配置目标节点",
    CHOICE_TARGET_NOT_FOUND: () =>
      nodeKey
        ? `选项目标节点不存在：${nodeKey}${choiceKey ? `.${choiceKey}` : ""}`
        : "选项目标节点不存在",
    UNREACHABLE_ROOTS: () => "存在未被任何分支指向的节点（可能是孤岛节点）",
  };

  const severity = String(issue?.severity || "").trim() || "warning";
  if (code && templates[code]) {
    return { code, nodeKey, choiceKey, severity, text: templates[code]() };
  }

  const message = String(issue?.message || issue?.text || "").trim();
  return {
    code,
    nodeKey,
    choiceKey,
    severity,
    text: message || "未知校验问题",
  };
}

async function copyToClipboard(text) {
  const value = String(text || "");
  if (!value) {
    return false;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function mapStoryToForm(next) {
  return {
    slug: next?.slug || "",
    title: next?.title || "",
    seriesId: next?.seriesId || "",
    description: next?.description || "",
    baseContext: next?.baseContext || "",
    initialStateText: formatJson(next?.initialState),
    isPublished: Boolean(next?.isPublished),
    aiEnabled: Boolean(next?.aiEnabled),
  };
}

function mapNodeToForm(node) {
  return {
    nodeKey: node?.nodeKey || "",
    title: node?.title || "",
    sortOrder: Number(node?.sortOrder || 0),
    baseContext: node?.baseContext || "",
    basePrompt: node?.basePrompt || "",
    fallbackText: node?.fallbackText || "",
    requiredFlagsText: formatStringList(node?.requiredFlags),
    blockedFlagsText: formatStringList(node?.blockedFlags),
    stateEffectsText: formatJson(node?.stateEffects),
    isEnding: Boolean(node?.isEnding),
    aiEnabled: Boolean(node?.aiEnabled),
  };
}

function mapChoiceToForm(choice) {
  return {
    choiceKey: choice?.choiceKey || "",
    label: choice?.label || "",
    description: choice?.description || "",
    targetNodeId: choice?.targetNodeId || "",
    sortOrder: Number(choice?.sortOrder || 0),
    requiredFlagsText: formatStringList(choice?.requiredFlags),
    blockedFlagsText: formatStringList(choice?.blockedFlags),
    stateEffectsText: formatJson(choice?.stateEffects),
  };
}

function compareFormState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function StoryLibraryCard({ item, isActive, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[24px] border px-4 py-4 text-left transition",
        isActive
          ? "border-[color:var(--gush-border-strong)] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.05)]"
          : "border-[color:var(--gush-border)] bg-white hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {item.title}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{item.slug}</p>
        </div>
        <AdminBadge tone={item.isPublished ? "success" : "default"}>
          {item.isPublished ? "已发布" : "草稿"}
        </AdminBadge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <AdminBadge>{item._count?.nodes || 0} 个节点</AdminBadge>
        <AdminBadge>{item._count?.progress || 0} 条进度</AdminBadge>
        <AdminBadge>{item.series?.title || "未绑定作品"}</AdminBadge>
      </div>
    </button>
  );
}

function ValidationList({ validation, onJumpNodeKey }) {
  if (!validation) {
    return (
      <p className="text-sm leading-6 text-slate-500">
        保存后可运行图谱校验，系统会在这里列出阻止发布的问题。
      </p>
    );
  }

  const rawIssues = validation?.issues;
  const issues = Array.isArray(rawIssues)
    ? rawIssues.map((issue) => formatValidationIssue(issue))
    : [
        ...(Array.isArray(rawIssues?.errors)
          ? rawIssues.errors.map((item) => ({
              severity: "error",
              message: item,
            }))
          : []),
        ...(Array.isArray(rawIssues?.warnings)
          ? rawIssues.warnings.map((item) => ({
              severity: "warning",
              message: item,
            }))
          : []),
      ].map((issue) => formatValidationIssue(issue));

  if (issues.length === 0) {
    return (
      <p className="text-sm leading-6 text-emerald-700">
        当前没有阻止发布的问题，图谱结构已通过校验。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue, index) => (
        <div
          key={`${issue.code || issue.text || "issue"}-${index}`}
          className={cn(
            "rounded-[18px] border px-3 py-3 text-sm leading-6",
            issue.severity === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {issue.nodeKey ? (
                    <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-black/70">
                      {issue.nodeKey}
                    </span>
                  ) : null}
                  {issue.choiceKey ? (
                    <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-black/70">
                      {issue.choiceKey}
                    </span>
                  ) : null}
                  {issue.code ? (
                    <span className="rounded-full border border-black/10 bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/50">
                      {issue.code}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 break-words">{issue.text}</div>
              </div>
            </div>
            {issue.nodeKey && typeof onJumpNodeKey === "function" ? (
              <button
                type="button"
                onClick={() => onJumpNodeKey(issue.nodeKey)}
                className="shrink-0 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] font-semibold text-black/70 transition hover:bg-white"
              >
                定位
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminInteractiveStoriesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [stories, setStories] = useState([]);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [activeTab, setActiveTab] = useState("story");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [validation, setValidation] = useState(null);
  const [story, setStory] = useState(emptyStory);
  const [storyQuery, setStoryQuery] = useState("");
  const [nodeQuery, setNodeQuery] = useState("");
  const [nodeFilterMode, setNodeFilterMode] = useState("all");
  const [nodeDraft, setNodeDraft] = useState(emptyNode);
  const [nodeForms, setNodeForms] = useState({});
  const [choiceForms, setChoiceForms] = useState({});
  const [newChoiceByNode, setNewChoiceByNode] = useState({});
  const [importMode, setImportMode] = useState("create");
  const [importText, setImportText] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "确认",
    variant: "danger",
    onConfirm: null,
  });

  const nodes = useMemo(
    () => (Array.isArray(detail?.nodes) ? detail.nodes : []),
    [detail],
  );
  const selectedNode = useMemo(
    () => nodes.find((item) => item.id === selectedNodeId) || nodes[0] || null,
    [nodes, selectedNodeId],
  );
  const selectedNodeForm = selectedNode
    ? nodeForms[selectedNode.id] || emptyNode()
    : emptyNode();
  const stateKeys = useMemo(
    () => summarizeStateKeys(story.initialStateText),
    [story.initialStateText],
  );
  const storyDirty = useMemo(() => {
    if (!detail) {
      return Boolean(
        story.slug ||
        story.title ||
        story.seriesId ||
        story.description ||
        story.baseContext ||
        story.initialStateText,
      );
    }
    return !compareFormState(story, mapStoryToForm(detail));
  }, [detail, story]);
  const nodeDirtyById = useMemo(() => {
    const next = {};
    for (const node of nodes) {
      next[node.id] = !compareFormState(
        nodeForms[node.id] || emptyNode(),
        mapNodeToForm(node),
      );
    }
    return next;
  }, [nodeForms, nodes]);
  const choiceDirtyById = useMemo(() => {
    const next = {};
    for (const node of nodes) {
      for (const choice of node.choices || []) {
        next[choice.id] = !compareFormState(
          choiceForms[choice.id] || emptyChoice(),
          mapChoiceToForm(choice),
        );
      }
    }
    return next;
  }, [choiceForms, nodes]);
  const filteredStories = useMemo(() => {
    const q = storyQuery.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter((item) =>
      [item.title, item.slug, item.series?.title]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [stories, storyQuery]);
  const filteredNodes = useMemo(() => {
    const q = nodeQuery.trim().toLowerCase();
    return nodes.filter((node) => {
      const matchesQuery =
        !q ||
        [
          node.title,
          node.nodeKey,
          ...(node.choices || []).map((choice) => choice.label),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      if (!matchesQuery) {
        return false;
      }
      switch (nodeFilterMode) {
        case "start":
          return detail?.initialNodeId === node.id;
        case "ending":
          return Boolean(node.isEnding);
        case "withChoices":
          return (node.choices?.length || 0) > 0;
        case "empty":
          return (node.choices?.length || 0) === 0;
        case "dirty":
          return (
            Boolean(nodeDirtyById[node.id]) ||
            (node.choices || []).some((choice) => choiceDirtyById[choice.id])
          );
        default:
          return true;
      }
    });
  }, [
    choiceDirtyById,
    detail?.initialNodeId,
    nodeDirtyById,
    nodeFilterMode,
    nodeQuery,
    nodes,
  ]);
  const selectedNodeDirty = selectedNode
    ? Boolean(nodeDirtyById[selectedNode.id])
    : false;
  const selectedChoiceDirtyCount = useMemo(() => {
    if (!selectedNode) return 0;
    return (selectedNode.choices || []).filter(
      (choice) => choiceDirtyById[choice.id],
    ).length;
  }, [choiceDirtyById, selectedNode]);
  const dirtyNodeCount = useMemo(
    () =>
      nodes.filter(
        (node) =>
          Boolean(nodeDirtyById[node.id]) ||
          (node.choices || []).some((choice) => choiceDirtyById[choice.id]),
      ).length,
    [choiceDirtyById, nodeDirtyById, nodes],
  );
  const validationTone = getValidationTone(validation);

  const publicSeriesHref = useMemo(() => {
    const normalized = String(story.seriesId || "").trim();
    return normalized ? `/series/${encodeURIComponent(normalized)}` : "";
  }, [story.seriesId]);

  const publicInteractiveHref = useMemo(() => {
    const normalized = String(story.seriesId || "").trim();
    return normalized
      ? `/series/${encodeURIComponent(normalized)}/interactive`
      : "";
  }, [story.seriesId]);

  const openPublicHref = useCallback((href) => {
    const normalized = String(href || "").trim();
    if (!normalized) return;
    if (typeof window === "undefined") return;
    window.open(normalized, "_blank", "noopener,noreferrer");
  }, []);

  const copyPublicHref = useCallback(async (href, successMessage) => {
    const normalized = String(href || "").trim();
    if (!normalized) return;
    const absolute = normalized.startsWith("http")
      ? normalized
      : `${window.location.origin}${normalized}`;
    const ok = await copyToClipboard(absolute);
    setFeedback({
      type: ok ? "success" : "error",
      message: ok ? successMessage : "复制失败，请手动选中复制",
    });
  }, []);

  const jumpToNodeKey = useCallback(
    (nodeKey) => {
      const normalizedKey = String(nodeKey || "").trim();
      if (!normalizedKey) {
        return;
      }

      const target = nodes.find(
        (item) => String(item?.nodeKey || "").trim() === normalizedKey,
      );
      setActiveTab("nodes");
      if (!target) {
        setFeedback({
          type: "error",
          message: `未找到节点 Key：${normalizedKey}`,
        });
        return;
      }
      setSelectedNodeId(target.id);
    },
    [nodes],
  );

  const loadStories = useCallback(async () => {
    setLoading(true);
    const resp = await adminGet(
      "/api/admin/interactive-stories?page=1&pageSize=100",
    );
    if (!resp.ok) {
      setStories([]);
      setFeedback({ type: "error", message: msg(resp, "加载互动小说失败") });
      setLoading(false);
      return;
    }
    const list = Array.isArray(resp.data?.stories) ? resp.data.stories : [];
    setStories(list);
    setSelectedStoryId((current) =>
      list.some((item) => item.id === current) ? current : list[0]?.id || "",
    );
    setLoading(false);
  }, []);

  const loadValidation = useCallback(async (id) => {
    if (!id) {
      setValidation(null);
      return;
    }
    const resp = await adminGet(
      `/api/admin/interactive-stories/${id}/validation`,
    );
    setValidation(resp.ok ? resp.data?.validation || null : null);
  }, []);

  const loadDetail = useCallback(
    async (id) => {
      if (!id) {
        setDetail(null);
        setStory(emptyStory());
        setSelectedNodeId("");
        setValidation(null);
        setNodeForms({});
        setChoiceForms({});
        setNewChoiceByNode({});
        return;
      }

      const resp = await adminGet(`/api/admin/interactive-stories/${id}`);
      if (!resp.ok) {
        setFeedback({ type: "error", message: msg(resp, "加载故事详情失败") });
        return;
      }

      const next = resp.data?.story || null;
      setDetail(next);
      setStory(mapStoryToForm(next));

      const nextNodeForms = {};
      const nextChoiceForms = {};
      const nextChoiceDrafts = {};

      for (const node of next?.nodes || []) {
        nextNodeForms[node.id] = mapNodeToForm(node);
        nextChoiceDrafts[node.id] = emptyChoice();
        for (const choice of node.choices || []) {
          nextChoiceForms[choice.id] = mapChoiceToForm(choice);
        }
      }

      setNodeForms(nextNodeForms);
      setChoiceForms(nextChoiceForms);
      setNewChoiceByNode(nextChoiceDrafts);
      setSelectedNodeId((current) =>
        next?.nodes?.some((item) => item.id === current)
          ? current
          : next?.nodes?.[0]?.id || "",
      );
      await loadValidation(id);
    },
    [loadValidation],
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
      return;
    }
    if (isAuthenticated) {
      void loadStories();
    }
  }, [isAuthenticated, isLoading, loadStories, router]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadDetail(selectedStoryId);
    }
  }, [isAuthenticated, loadDetail, selectedStoryId]);

  function resetToNewStory() {
    setSelectedStoryId("");
    setSelectedNodeId("");
    setDetail(null);
    setStory(emptyStory());
    setNodeDraft(emptyNode());
    setNodeForms({});
    setChoiceForms({});
    setNewChoiceByNode({});
    setValidation(null);
    setActiveTab("story");
  }

  function buildStoryPayload() {
    return {
      slug: story.slug,
      title: story.title,
      seriesId: story.seriesId || null,
      description: story.description || null,
      baseContext: story.baseContext || null,
      initialState: parseJsonText(story.initialStateText, "故事初始状态"),
      isPublished: story.isPublished,
      aiEnabled: story.aiEnabled,
    };
  }

  function buildNodePayload(form) {
    return {
      nodeKey: form.nodeKey,
      title: form.title,
      sortOrder: normalizeInteger(form.sortOrder),
      baseContext: form.baseContext || null,
      basePrompt: form.basePrompt || null,
      fallbackText: form.fallbackText || null,
      requiredFlags: parseStringList(form.requiredFlagsText),
      blockedFlags: parseStringList(form.blockedFlagsText),
      stateEffects: parseJsonText(form.stateEffectsText, "节点状态变更"),
      isEnding: Boolean(form.isEnding),
      aiEnabled: Boolean(form.aiEnabled),
    };
  }

  function buildChoicePayload(form) {
    return {
      choiceKey: form.choiceKey,
      label: form.label,
      description: form.description || null,
      targetNodeId: form.targetNodeId || null,
      sortOrder: normalizeInteger(form.sortOrder),
      requiredFlags: parseStringList(form.requiredFlagsText),
      blockedFlags: parseStringList(form.blockedFlagsText),
      stateEffects: parseJsonText(form.stateEffectsText, "选项状态变更"),
    };
  }

  function buildUniqueNodeKey(baseKey) {
    const normalized = String(baseKey || "").trim() || "node";
    const existingKeys = new Set(
      nodes.map((node) => String(node?.nodeKey || "").trim()).filter(Boolean),
    );
    if (!existingKeys.has(normalized)) {
      return normalized;
    }
    for (let index = 2; index <= 999; index += 1) {
      const candidate = `${normalized}-${index}`;
      if (!existingKeys.has(candidate)) {
        return candidate;
      }
    }
    return `${normalized}-${Date.now()}`;
  }

  async function duplicateNode(nodeId) {
    if (!selectedStoryId || !nodeId) return;
    const node = nodes.find((item) => item.id === nodeId);
    const form =
      nodeForms[nodeId] || (node ? mapNodeToForm(node) : emptyNode());

    let payload;
    try {
      payload = buildNodePayload(form);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    const nextPayload = {
      ...payload,
      nodeKey: buildUniqueNodeKey(`${payload.nodeKey || "node"}-copy`),
      title: payload.title ? `${payload.title}（副本）` : "节点副本",
      sortOrder: normalizeInteger(payload.sortOrder) + 1,
    };

    setBusy(true);
    const resp = await adminPost(
      `/api/admin/interactive-stories/${selectedStoryId}/nodes`,
      {
        node: nextPayload,
        setAsInitial: false,
      },
    );
    setBusy(false);

    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "复制节点失败") });
      return;
    }

    setFeedback({ type: "success", message: "节点副本已创建" });
    await loadDetail(selectedStoryId);
    setSelectedNodeId(resp.data?.node?.id || "");
  }

  async function resequenceNodesNow() {
    if (!selectedStoryId) return;
    if (dirtyNodeCount > 0) {
      setFeedback({
        type: "error",
        message: "请先保存所有未保存的节点/选项后再重排排序。",
      });
      return;
    }

    const ordered = [...nodes].sort((a, b) => {
      const left = Number(a?.sortOrder || 0);
      const right = Number(b?.sortOrder || 0);
      if (left !== right) return left - right;
      return String(a?.nodeKey || "").localeCompare(String(b?.nodeKey || ""));
    });
    if (ordered.length === 0) {
      setFeedback({ type: "error", message: "当前故事还没有节点，无法重排。" });
      return;
    }

    setBusy(true);
    try {
      for (let index = 0; index < ordered.length; index += 1) {
        const node = ordered[index];
        const nextSortOrder = (index + 1) * 10;
        if (Number(node.sortOrder || 0) === nextSortOrder) continue;
        const payload = buildNodePayload(mapNodeToForm(node));
        const resp = await adminPatch(
          `/api/admin/interactive-stories/nodes/${node.id}`,
          {
            node: { ...payload, sortOrder: nextSortOrder },
          },
        );
        if (!resp.ok) {
          throw new Error(
            msg(resp, `节点 ${node.nodeKey || node.id} 重排失败`),
          );
        }
      }
      setFeedback({ type: "success", message: "节点排序已重排" });
      await loadDetail(selectedStoryId);
    } catch (error) {
      setFeedback({
        type: "error",
        message: `重排失败：${msg(error, "未知错误")}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function resequenceChoicesNow(nodeId) {
    if (!selectedStoryId || !nodeId) return;
    if (dirtyNodeCount > 0) {
      setFeedback({
        type: "error",
        message: "请先保存所有未保存的节点/选项后再重排排序。",
      });
      return;
    }
    const node = nodes.find((item) => item.id === nodeId);
    const choices = Array.isArray(node?.choices) ? [...node.choices] : [];
    if (!node || choices.length === 0) {
      setFeedback({ type: "error", message: "当前节点没有选项，无法重排。" });
      return;
    }

    choices.sort((a, b) => {
      const left = Number(a?.sortOrder || 0);
      const right = Number(b?.sortOrder || 0);
      if (left !== right) return left - right;
      return String(a?.choiceKey || "").localeCompare(
        String(b?.choiceKey || ""),
      );
    });

    setBusy(true);
    try {
      for (let index = 0; index < choices.length; index += 1) {
        const choice = choices[index];
        const nextSortOrder = (index + 1) * 10;
        if (Number(choice.sortOrder || 0) === nextSortOrder) continue;
        const payload = buildChoicePayload(mapChoiceToForm(choice));
        const resp = await adminPatch(
          `/api/admin/interactive-stories/choices/${choice.id}`,
          {
            choice: { ...payload, sortOrder: nextSortOrder },
          },
        );
        if (!resp.ok) {
          throw new Error(
            msg(resp, `选项 ${choice.choiceKey || choice.id} 重排失败`),
          );
        }
      }
      setFeedback({ type: "success", message: "选项排序已重排" });
      await loadDetail(selectedStoryId);
    } catch (error) {
      setFeedback({
        type: "error",
        message: `重排失败：${msg(error, "未知错误")}`,
      });
    } finally {
      setBusy(false);
    }
  }

  const openResequenceNodesConfirm = useCallback(() => {
    if (!selectedStoryId) return;
    setConfirmDialog({
      isOpen: true,
      title: "重排节点排序",
      message:
        "将按当前已保存的节点 sortOrder 重新编号为 10/20/30...。建议先保存所有未保存改动。",
      confirmText: "开始重排",
      variant: "warning",
      onConfirm: () => resequenceNodesNow(),
    });
  }, [resequenceNodesNow, selectedStoryId]);

  const openResequenceChoicesConfirm = useCallback(
    (nodeId) => {
      if (!selectedStoryId || !nodeId) return;
      setConfirmDialog({
        isOpen: true,
        title: "重排选项排序",
        message:
          "将按当前已保存的选项 sortOrder 重新编号为 10/20/30...。建议先保存所有未保存改动。",
        confirmText: "开始重排",
        variant: "warning",
        onConfirm: () => resequenceChoicesNow(nodeId),
      });
    },
    [resequenceChoicesNow, selectedStoryId],
  );

  async function saveStory() {
    if (!selectedStoryId) return;

    let payload;
    try {
      payload = buildStoryPayload();
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    setBusy(true);
    const resp = await adminPatch(
      `/api/admin/interactive-stories/${selectedStoryId}`,
      { story: payload },
    );
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "保存故事失败") });
      return;
    }
    setFeedback({ type: "success", message: "故事设定已保存" });
    await loadStories();
    await loadDetail(selectedStoryId);
  }

  async function createStory() {
    if (!story.slug.trim() || !story.title.trim()) {
      setFeedback({ type: "error", message: "请先填写故事 slug 和标题" });
      return;
    }

    let payload;
    try {
      payload = buildStoryPayload();
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    setBusy(true);
    const resp = await adminPost("/api/admin/interactive-stories", {
      story: payload,
    });
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "创建故事失败") });
      return;
    }
    setFeedback({ type: "success", message: "互动故事已创建" });
    await loadStories();
    setSelectedStoryId(resp.data?.story?.id || "");
    setActiveTab("nodes");
  }

  async function publishStory(publish) {
    if (!selectedStoryId) return;
    setBusy(true);
    const resp = await adminPost(
      `/api/admin/interactive-stories/${selectedStoryId}/publish`,
      { publish },
    );
    setBusy(false);
    if (!resp.ok) {
      setFeedback({
        type: "error",
        message: msg(resp, publish ? "发布失败，请先修复校验问题" : "下线失败"),
      });
      return;
    }
    setFeedback({
      type: "success",
      message: publish ? "故事已发布到前台" : "故事已从前台下线",
    });
    await loadStories();
    await loadDetail(selectedStoryId);
  }

  async function removeStory() {
    if (!selectedStoryId) {
      return;
    }
    const resp = await adminDelete(
      `/api/admin/interactive-stories/${selectedStoryId}`,
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "删除故事失败") });
      return;
    }
    setFeedback({ type: "success", message: "故事已删除" });
    resetToNewStory();
    await loadStories();
  }

  async function createNode() {
    if (!selectedStoryId) return;

    let payload;
    try {
      payload = buildNodePayload(nodeDraft);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    const resp = await adminPost(
      `/api/admin/interactive-stories/${selectedStoryId}/nodes`,
      {
        node: payload,
        setAsInitial: nodes.length === 0,
      },
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "创建节点失败") });
      return;
    }
    setFeedback({ type: "success", message: "节点已创建" });
    setNodeDraft(emptyNode());
    await loadDetail(selectedStoryId);
    setSelectedNodeId(resp.data?.node?.id || "");
  }

  async function saveNode(nodeId) {
    const form = nodeForms[nodeId];
    let payload;
    try {
      payload = buildNodePayload(form);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    const resp = await adminPatch(
      `/api/admin/interactive-stories/nodes/${nodeId}`,
      { node: payload },
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "保存节点失败") });
      return;
    }
    setFeedback({ type: "success", message: "节点已保存" });
    await loadDetail(selectedStoryId);
  }

  async function setStartNode(nodeId) {
    const form = nodeForms[nodeId] || emptyNode();
    let payload;
    try {
      payload = buildNodePayload(form);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    const resp = await adminPatch(
      `/api/admin/interactive-stories/nodes/${nodeId}`,
      {
        node: payload,
        setAsInitial: true,
      },
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "设置起始节点失败") });
      return;
    }
    setFeedback({ type: "success", message: "已设为起始节点" });
    await loadDetail(selectedStoryId);
  }

  async function removeNode(nodeId) {
    const resp = await adminDelete(
      `/api/admin/interactive-stories/nodes/${nodeId}`,
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "删除节点失败") });
      return;
    }
    setFeedback({ type: "success", message: "节点已删除" });
    await loadDetail(selectedStoryId);
  }

  async function saveChoice(choiceId) {
    const form = choiceForms[choiceId];
    let payload;
    try {
      payload = buildChoicePayload(form);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    const resp = await adminPatch(
      `/api/admin/interactive-stories/choices/${choiceId}`,
      { choice: payload },
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "保存选项失败") });
      return;
    }
    setFeedback({ type: "success", message: "选项已保存" });
    await loadDetail(selectedStoryId);
  }

  async function createTargetNodeForChoice(choiceId, sourceNode) {
    if (!selectedStoryId || !choiceId) {
      return;
    }

    if (dirtyNodeCount > 0) {
      setFeedback({
        type: "warning",
        message: "你有未保存的改动。请先保存后再新建目标节点。",
      });
      return;
    }

    if (choiceDirtyById[choiceId]) {
      setFeedback({
        type: "warning",
        message: "这个选项还没保存。请先保存选项，再新建目标节点。",
      });
      return;
    }

    const base = emptyNode();
    const nextForm = {
      ...base,
      nodeKey: buildUniqueNodeKey("node"),
      title: "新节点",
      sortOrder: Number(sourceNode?.sortOrder || 0) + 10,
    };

    let nodePayload;
    try {
      nodePayload = buildNodePayload(nextForm);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    setBusy(true);
    const createResp = await adminPost(
      `/api/admin/interactive-stories/${selectedStoryId}/nodes`,
      {
        node: nodePayload,
        setAsInitial: false,
      },
    );
    if (!createResp.ok) {
      setBusy(false);
      setFeedback({
        type: "error",
        message: msg(createResp, "创建目标节点失败"),
      });
      return;
    }

    const createdNodeId = createResp.data?.node?.id || "";
    if (!createdNodeId) {
      setBusy(false);
      setFeedback({ type: "error", message: "创建目标节点失败：缺少 node.id" });
      return;
    }

    const currentChoiceForm = choiceForms[choiceId] || emptyChoice();
    let choicePayload;
    try {
      choicePayload = buildChoicePayload({
        ...currentChoiceForm,
        targetNodeId: createdNodeId,
      });
    } catch (error) {
      setBusy(false);
      setFeedback({ type: "error", message: error.message });
      return;
    }

    const patchResp = await adminPatch(
      `/api/admin/interactive-stories/choices/${choiceId}`,
      { choice: choicePayload },
    );
    setBusy(false);
    if (!patchResp.ok) {
      setFeedback({
        type: "error",
        message: msg(patchResp, "已创建节点，但绑定选项失败"),
      });
      await loadDetail(selectedStoryId);
      return;
    }

    setFeedback({ type: "success", message: "已创建目标节点并绑定到该选项" });
    await loadDetail(selectedStoryId);
    setActiveTab("nodes");
    setSelectedNodeId(createdNodeId);
  }

  async function addChoice(nodeId) {
    const form = newChoiceByNode[nodeId] || emptyChoice();
    let payload;
    try {
      payload = buildChoicePayload(form);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    const resp = await adminPost(
      `/api/admin/interactive-stories/nodes/${nodeId}/choices`,
      { choice: payload },
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "新增选项失败") });
      return;
    }
    setFeedback({ type: "success", message: "新选项已添加" });
    setNewChoiceByNode((current) => ({ ...current, [nodeId]: emptyChoice() }));
    await loadDetail(selectedStoryId);
  }

  async function removeChoice(choiceId) {
    const resp = await adminDelete(
      `/api/admin/interactive-stories/choices/${choiceId}`,
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "删除选项失败") });
      return;
    }
    setFeedback({ type: "success", message: "选项已删除" });
    await loadDetail(selectedStoryId);
  }

  function openRemoveStoryConfirm() {
    if (!selectedStoryId) {
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "删除互动故事",
      message:
        "确认删除当前故事吗？删除后节点与选项会一起移除，已经保存的读者进度也会失去对应内容。",
      confirmText: "删除故事",
      variant: "danger",
      onConfirm: () => {
        void removeStory();
      },
    });
  }

  function openRemoveNodeConfirm(nodeId) {
    if (!nodeId) {
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "删除节点",
      message:
        "确认删除这个节点吗？系统会自动处理受影响的分支引用，但这个节点本身的结构和文案不会保留。",
      confirmText: "删除节点",
      variant: "danger",
      onConfirm: () => {
        void removeNode(nodeId);
      },
    });
  }

  function openRemoveChoiceConfirm(choiceId) {
    if (!choiceId) {
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "删除选项",
      message: "确认删除这个选项吗？删除后当前节点的分支路径会立即变化。",
      confirmText: "删除选项",
      variant: "danger",
      onConfirm: () => {
        void removeChoice(choiceId);
      },
    });
  }

  async function exportStory() {
    if (!selectedStoryId) return;
    const resp = await adminGet(
      `/api/admin/interactive-stories/${selectedStoryId}/export`,
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "导出失败") });
      return;
    }
    const payload = resp.data?.payload || {};
    exportJson(
      `${payload?.story?.slug || selectedStoryId}-interactive-story.json`,
      payload,
    );
    setFeedback({ type: "success", message: "导出完成" });
  }

  async function copyStoryJson() {
    if (!selectedStoryId) return;
    const resp = await adminGet(
      `/api/admin/interactive-stories/${selectedStoryId}/export`,
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "获取导出 JSON 失败") });
      return;
    }
    const payload = resp.data?.payload || {};
    const ok = await copyToClipboard(JSON.stringify(payload, null, 2));
    setFeedback({
      type: ok ? "success" : "error",
      message: ok ? "导出 JSON 已复制" : "复制失败，请改用下载导出",
    });
  }

  function fillImportTemplate() {
    const template = {
      story: {
        slug: "midnight-archive",
        title: "午夜来信",
        description: "用于测试的互动小说骨架示例（可改成你的真实作品）。",
        seriesId: "",
        baseContext: "角色设定、世界观、叙事口吻都可以写在这里。",
        initialNodeId: "intro-01",
        initialState: { trust: 0, risk: 0, clues: 0 },
        aiEnabled: true,
      },
      nodes: [
        {
          nodeKey: "intro-01",
          title: "开场",
          basePrompt: "写一段 120-180 字的剧情开场，留一个悬念。",
          fallbackText: "AI 失败时显示这段兜底文本。",
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: 0,
          isEnding: false,
          aiEnabled: true,
          choices: [
            {
              choiceKey: "look_closer",
              label: "仔细查看",
              description: "更谨慎一点。",
              targetNodeKey: "scene-02",
              requiredFlags: [],
              blockedFlags: [],
              stateEffects: { clues: 1 },
              sortOrder: 0,
            },
            {
              choiceKey: "walk_away",
              label: "先离开",
              description: "先保命。",
              targetNodeKey: "scene-02",
              requiredFlags: [],
              blockedFlags: [],
              stateEffects: { risk: -1 },
              sortOrder: 1,
            },
          ],
        },
        {
          nodeKey: "scene-02",
          title: "第二幕",
          basePrompt: "延续上一个选择的后果，给出新的分支。",
          fallbackText: "继续推进剧情。",
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: 1,
          isEnding: false,
          aiEnabled: true,
          choices: [
            {
              choiceKey: "ask_editor",
              label: "去找编辑",
              description: "",
              targetNodeKey: "ending-01",
              requiredFlags: [],
              blockedFlags: [],
              stateEffects: { trust: 1 },
              sortOrder: 0,
            },
          ],
        },
        {
          nodeKey: "ending-01",
          title: "结局",
          basePrompt: "收束剧情，给一个结尾。",
          fallbackText: "故事到此结束。",
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: 2,
          isEnding: true,
          aiEnabled: false,
          choices: [],
        },
      ],
    };

    setImportMode("create");
    setImportText(JSON.stringify(template, null, 2));
    setActiveTab("json");
    setFeedback({
      type: "success",
      message: "已生成导入模板，可直接修改后导入",
    });
  }

  async function importStory() {
    if (!importText.trim()) {
      setFeedback({ type: "error", message: "请先粘贴导入 JSON" });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(importText);
    } catch {
      setFeedback({ type: "error", message: "JSON 格式不合法" });
      return;
    }

    setBusy(true);
    const resp = await adminPost("/api/admin/interactive-stories/import", {
      mode: importMode,
      payload,
    });
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "导入失败") });
      return;
    }
    setFeedback({ type: "success", message: "导入成功，故事结构已刷新" });
    setValidation(resp.data?.validation || null);
    await loadStories();
    setSelectedStoryId(resp.data?.story?.id || "");
  }

  const selectedStorySummary = detail
    ? [
        { label: "所属作品", value: detail.series?.title || "未绑定作品" },
        {
          label: "起始节点",
          value:
            nodes.find((item) => item.id === detail.initialNodeId)?.title ||
            "未设置",
        },
        { label: "AI 生成", value: detail.aiEnabled ? "开启" : "关闭" },
        {
          label: "状态键",
          value: stateKeys.length > 0 ? stateKeys.join(" / ") : "未定义",
        },
      ]
    : [];

  return (
    <AdminShell
      title="互动小说创作台"
      subtitle="把故事设定、节点编排、分支条件和发布校验收进一个真正能写稿的后台里。"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => loadDetail(selectedStoryId)}
            disabled={!selectedStoryId}
          >
            <RefreshCw className="size-4" />
            刷新
          </Button>
          <Button variant="outline" onClick={fillImportTemplate}>
            <FileJson className="size-4" />
            模板
          </Button>
          {selectedStoryId ? (
            <>
              <Button variant="outline" onClick={copyStoryJson}>
                <Copy className="size-4" />
                复制 JSON
              </Button>
              <Button variant="outline" onClick={exportStory}>
                <Download className="size-4" />
                导出
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        {feedback.message ? (
          <section
            className={cn(
              "rounded-[22px] border px-4 py-3 text-sm",
              feedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {feedback.message}
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="节点总数"
            value={nodes.length}
            detail="当前图谱里的剧情节点数量"
          />
          <AdminMetricCard
            label="分支总数"
            value={nodes.reduce(
              (sum, node) => sum + (node.choices?.length || 0),
              0,
            )}
            detail="所有节点下的选项总和"
          />
          <AdminMetricCard
            label="结局节点"
            value={nodes.filter((node) => node.isEnding).length}
            detail="已标记为结局的节点数量"
          />
          <AdminMetricCard
            label="发布校验"
            value={validation?.ok ? "可发布" : "待修复"}
            detail={
              validation
                ? `错误 ${validation.errors} / 警告 ${validation.warnings}`
                : "先运行一次结构校验"
            }
            tone={validation?.ok ? "accent" : "default"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
          <AdminPageSection
            title="故事库"
            description="切换已有故事，或直接开一个新的互动稿。"
          >
            <div className="space-y-4">
              <input
                value={storyQuery}
                onChange={(event) => setStoryQuery(event.target.value)}
                placeholder="搜索标题、slug、作品名"
                className={adminInputClassName}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={resetToNewStory}
              >
                <Plus className="size-4" />
                新建互动故事
              </Button>
              <div className="space-y-2">
                {loading ? (
                  <div className="rounded-[20px] border border-[color:var(--gush-border)] px-4 py-6 text-sm text-slate-500">
                    正在加载故事列表...
                  </div>
                ) : filteredStories.length > 0 ? (
                  filteredStories.map((item) => (
                    <StoryLibraryCard
                      key={item.id}
                      item={item}
                      isActive={selectedStoryId === item.id}
                      onSelect={() => {
                        setSelectedStoryId(item.id);
                        setActiveTab("nodes");
                      }}
                    />
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[color:var(--gush-border)] px-4 py-8 text-sm leading-6 text-slate-500">
                    当前没有匹配的互动故事。可以先新建一个稿子，或者换个关键词搜索。
                  </div>
                )}
              </div>
            </div>
          </AdminPageSection>

          <div className="space-y-6">
            <AdminPageSection
              title={
                selectedStoryId ? detail?.title || "故事工作区" : "开始新故事"
              }
              description={
                selectedStoryId
                  ? "先把世界观和起始状态定好，再去排节点与分支。"
                  : "填好基础资料后就能创建故事，再进入节点编排。"
              }
              action={
                <AdminTabs
                  items={TABS}
                  value={activeTab}
                  onChange={setActiveTab}
                />
              }
            >
              {activeTab === "story" ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <AdminFormField
                        label="故事 slug"
                        helperText="用于后台识别和导入导出命名。"
                      >
                        <input
                          value={story.slug}
                          onChange={(event) =>
                            setStory((current) => ({
                              ...current,
                              slug: event.target.value,
                            }))
                          }
                          className={adminInputClassName}
                          placeholder="midnight-archive"
                        />
                      </AdminFormField>
                      <AdminFormField
                        label="故事标题"
                        helperText="面向运营与作者的主标题。"
                      >
                        <input
                          value={story.title}
                          onChange={(event) =>
                            setStory((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          className={adminInputClassName}
                          placeholder="午夜档案馆"
                        />
                      </AdminFormField>
                      <AdminFormField
                        label="绑定作品 ID"
                        helperText="如果要挂到现有小说详情页，这里填 seriesId。"
                      >
                        <input
                          value={story.seriesId}
                          onChange={(event) =>
                            setStory((current) => ({
                              ...current,
                              seriesId: event.target.value,
                            }))
                          }
                          className={adminInputClassName}
                          placeholder="series-011"
                        />
                      </AdminFormField>
                      <AdminFormField
                        label="一句话简介"
                        helperText="给后台同事快速理解这篇互动稿的定位。"
                      >
                        <input
                          value={story.description}
                          onChange={(event) =>
                            setStory((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          className={adminInputClassName}
                          placeholder="悬疑、试探与风险同时推进的分支故事。"
                        />
                      </AdminFormField>
                    </div>

                    <AdminFormField
                      label="世界观与主线背景"
                      helperText="这里写不可跑偏的设定、角色关系、叙事边界，AI 会把它当作母设定。"
                    >
                      <textarea
                        rows={10}
                        value={story.baseContext}
                        onChange={(event) =>
                          setStory((current) => ({
                            ...current,
                            baseContext: event.target.value,
                          }))
                        }
                        className={adminTextareaClassName}
                        placeholder="写清楚故事背景、角色设定、叙事视角、禁止越界的规则。"
                      />
                    </AdminFormField>

                    <AdminFormField
                      label="初始状态 JSON"
                      helperText='例如 {"trust": 0, "risk": 1, "flags": []}。这里决定读者进入故事时的默认状态。'
                    >
                      <textarea
                        rows={8}
                        value={story.initialStateText}
                        onChange={(event) =>
                          setStory((current) => ({
                            ...current,
                            initialStateText: event.target.value,
                          }))
                        }
                        className={adminTextareaClassName}
                        placeholder='{"trust": 0, "risk": 1, "clues": 0}'
                      />
                    </AdminFormField>

                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={story.aiEnabled}
                          onChange={(event) =>
                            setStory((current) => ({
                              ...current,
                              aiEnabled: event.target.checked,
                            }))
                          }
                          className={adminCheckboxClassName}
                        />
                        启用 AI 个性化生成
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={story.isPublished}
                          onChange={(event) =>
                            setStory((current) => ({
                              ...current,
                              isPublished: event.target.checked,
                            }))
                          }
                          className={adminCheckboxClassName}
                        />
                        发布状态仅作参考显示
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div
                      className={cn(
                        "rounded-[24px] border px-4 py-4",
                        validationTone === "danger"
                          ? "border-rose-200 bg-rose-50"
                          : validationTone === "warning"
                            ? "border-amber-200 bg-amber-50"
                            : validationTone === "success"
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]",
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        {validation?.ok
                          ? "当前图谱可发布"
                          : "当前图谱还没达到发布标准"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {validation
                          ? `错误 ${validation.errors}，警告 ${validation.warnings}`
                          : "建议先保存故事，再运行一次结构校验。"}
                      </p>
                    </div>

                    {selectedStorySummary.length > 0 ? (
                      <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-950">
                            当前故事概览
                          </p>
                          {storyDirty ? (
                            <AdminBadge tone="warning">有未保存修改</AdminBadge>
                          ) : (
                            <AdminBadge tone="success">已同步</AdminBadge>
                          )}
                        </div>
                        <div className="mt-3 space-y-3">
                          {selectedStorySummary.map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between gap-4 border-b border-[color:var(--gush-border)] pb-3 last:border-b-0 last:pb-0"
                            >
                              <span className="text-sm text-slate-500">
                                {item.label}
                              </span>
                              <span className="text-sm font-medium text-slate-950">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full"
                        onClick={selectedStoryId ? saveStory : createStory}
                        disabled={busy}
                      >
                        <Save className="size-4" />
                        {selectedStoryId ? "保存故事设定" : "创建故事"}
                      </Button>
                      {publicInteractiveHref ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => openPublicHref(publicInteractiveHref)}
                          disabled={!publicInteractiveHref}
                        >
                          <ArrowUpRight className="size-4" />
                          打开前台互动阅读
                        </Button>
                      ) : null}
                      {publicSeriesHref ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => openPublicHref(publicSeriesHref)}
                          disabled={!publicSeriesHref}
                        >
                          <ArrowUpRight className="size-4" />
                          打开前台作品页
                        </Button>
                      ) : null}
                      {publicInteractiveHref ? (
                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={() =>
                            copyPublicHref(
                              publicInteractiveHref,
                              "互动阅读链接已复制",
                            )
                          }
                        >
                          <Copy className="size-4" />
                          复制互动阅读链接
                        </Button>
                      ) : null}
                      {selectedStoryId ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => loadValidation(selectedStoryId)}
                        >
                          <ShieldCheck className="size-4" />
                          运行图谱校验
                        </Button>
                      ) : null}
                      {selectedStoryId ? (
                        <Button
                          className="w-full"
                          onClick={() => publishStory(true)}
                          disabled={busy}
                        >
                          <CheckCircle2 className="size-4" />
                          发布到前台
                        </Button>
                      ) : null}
                      {selectedStoryId ? (
                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={() => publishStory(false)}
                          disabled={busy}
                        >
                          下线互动入口
                        </Button>
                      ) : null}
                      {selectedStoryId ? (
                        <Button
                          className="w-full"
                          variant="destructive"
                          onClick={openRemoveStoryConfirm}
                        >
                          <Trash2 className="size-4" />
                          删除故事
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
              {activeTab === "json" ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="space-y-4">
                    <AdminFormField
                      label="导入模式"
                      helperText="新建模式不会覆盖现有稿件；替换模式会清空原有节点后重建。"
                    >
                      <select
                        value={importMode}
                        onChange={(event) => setImportMode(event.target.value)}
                        className={adminSelectClassName}
                      >
                        <option value="create">新建故事</option>
                        <option value="replace">替换现有故事</option>
                      </select>
                    </AdminFormField>
                    <AdminFormField label="导入 JSON">
                      <textarea
                        rows={20}
                        value={importText}
                        onChange={(event) => setImportText(event.target.value)}
                        className={adminTextareaClassName}
                        placeholder='{"story": {...}, "nodes": [...]}'
                      />
                    </AdminFormField>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={importStory} disabled={busy}>
                        <Upload className="size-4" />
                        执行导入
                      </Button>
                      {selectedStoryId ? (
                        <Button variant="outline" onClick={exportStory}>
                          <Download className="size-4" />
                          导出当前故事
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2 text-slate-950">
                        <FileJson className="size-4" />
                        <p className="font-semibold">推荐工作流</p>
                      </div>
                      <div className="mt-3 space-y-2 leading-6">
                        <p>1. 用模板先导入故事壳子和基础节点。</p>
                        <p>2. 回到“节点编排”页补剧情背景、条件与状态变更。</p>
                        <p>3. 跑一次校验，确保错误为 0。</p>
                        <p>4. 发布前再从读者视角走一遍主线和结局。</p>
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2 text-slate-950">
                        <Sparkles className="size-4" />
                        <p className="font-semibold">导入内容建议</p>
                      </div>
                      <div className="mt-3 space-y-2 leading-6">
                        <p>故事层：标题、简介、母设定、初始状态。</p>
                        <p>
                          节点层：nodeKey、title、baseContext、basePrompt、fallbackText。
                        </p>
                        <p>
                          分支层：choiceKey、label、跳转节点、条件、状态变更。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {activeTab === "nodes" ? (
                <InteractiveStoryNodesTab
                  detail={detail}
                  nodes={nodes}
                  filteredNodes={filteredNodes}
                  selectedNode={selectedNode}
                  selectedNodeForm={selectedNodeForm}
                  selectedNodeDirty={selectedNodeDirty}
                  selectedChoiceDirtyCount={selectedChoiceDirtyCount}
                  setSelectedNodeId={setSelectedNodeId}
                  nodeQuery={nodeQuery}
                  setNodeQuery={setNodeQuery}
                  nodeFilterMode={nodeFilterMode}
                  setNodeFilterMode={setNodeFilterMode}
                  nodeDirtyById={nodeDirtyById}
                  choiceDirtyById={choiceDirtyById}
                  dirtyNodeCount={dirtyNodeCount}
                  nodeDraft={nodeDraft}
                  setNodeDraft={setNodeDraft}
                  createNode={createNode}
                  selectedStoryId={selectedStoryId}
                  setNodeForms={setNodeForms}
                  saveNode={saveNode}
                  setStartNode={setStartNode}
                  removeNode={openRemoveNodeConfirm}
                  duplicateNode={duplicateNode}
                  openResequenceNodesConfirm={openResequenceNodesConfirm}
                  openResequenceChoicesConfirm={openResequenceChoicesConfirm}
                  choiceForms={choiceForms}
                  setChoiceForms={setChoiceForms}
                  newChoiceByNode={newChoiceByNode}
                  setNewChoiceByNode={setNewChoiceByNode}
                  saveChoice={saveChoice}
                  removeChoice={openRemoveChoiceConfirm}
                  addChoice={addChoice}
                />
              ) : null}
            </AdminPageSection>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <AdminPageSection
                title="发布校验面板"
                description="发布前先看这里，别让断链节点、缺失起点、空分支这种问题混进线上。"
                accent="blue"
              >
                <ValidationList
                  validation={validation}
                  onJumpNodeKey={jumpToNodeKey}
                />
              </AdminPageSection>

              <AdminPageSection
                title="创作重点提醒"
                description="这不是自由聊天，是有主线的互动阅读，所以每个节点都得能自圆其说。"
              >
                <div className="space-y-3 text-sm leading-6 text-slate-600">
                  <div className="flex items-start gap-3 rounded-[18px] border border-[color:var(--gush-border)] bg-white px-4 py-3">
                    <BookCopy className="mt-0.5 size-4 shrink-0 text-slate-500" />
                    <p>
                      故事背景要写在母设定里，节点只负责当前场景，不要把总设定散得到处都是。
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-[18px] border border-[color:var(--gush-border)] bg-white px-4 py-3">
                    <GitBranch className="mt-0.5 size-4 shrink-0 text-slate-500" />
                    <p>
                      节点分支最好保持清晰的心理差异或信息差，不要做文案不一样但结果一样的假分支。
                    </p>
                  </div>
                  <div className="flex items-start gap-3 rounded-[18px] border border-[color:var(--gush-border)] bg-white px-4 py-3">
                    <ListChecks className="mt-0.5 size-4 shrink-0 text-slate-500" />
                    <p>
                      状态变更和标记条件尽量写短、写准，后面查问题的时候才不会把自己坑死。
                    </p>
                  </div>
                </div>
              </AdminPageSection>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog((current) => ({
            ...current,
            isOpen: false,
          }))
        }
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText="取消"
        variant={confirmDialog.variant}
      />
    </AdminShell>
  );
}

function InteractiveStoryNodesTab({
  detail,
  nodes,
  filteredNodes,
  selectedNode,
  selectedNodeForm,
  selectedNodeDirty,
  selectedChoiceDirtyCount,
  setSelectedNodeId,
  nodeQuery,
  setNodeQuery,
  nodeFilterMode,
  setNodeFilterMode,
  nodeDirtyById,
  choiceDirtyById,
  dirtyNodeCount,
  nodeDraft,
  setNodeDraft,
  createNode,
  selectedStoryId,
  setNodeForms,
  saveNode,
  setStartNode,
  removeNode,
  duplicateNode,
  openResequenceNodesConfirm,
  openResequenceChoicesConfirm,
  choiceForms,
  setChoiceForms,
  newChoiceByNode,
  setNewChoiceByNode,
  saveChoice,
  removeChoice,
  addChoice,
}) {
  const selectedNodeTargets = useMemo(() => {
    if (!selectedNode) return [];
    const targetIds = Array.from(
      new Set(
        (selectedNode.choices || [])
          .map((choice) => choice.targetNodeId)
          .filter(Boolean),
      ),
    );
    return targetIds
      .map((targetId) => nodes.find((node) => node.id === targetId))
      .filter(Boolean);
  }, [nodes, selectedNode]);
  const selectedNodeChoiceCount = selectedNode?.choices?.length || 0;
  const selectedNodeHasJumpTargets = selectedNodeTargets.length > 0;
  const newNodeReady = Boolean(
    nodeDraft.nodeKey.trim() && nodeDraft.title.trim(),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-4">
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            当前焦点
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {selectedNode?.title || "还没选节点"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {selectedNode?.nodeKey || "先从节点地图里选中一个节点"}
          </p>
        </div>
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            待保存
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {dirtyNodeCount} 个节点
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {selectedNodeDirty || selectedChoiceDirtyCount > 0
              ? "当前选中节点也有未保存改动"
              : "当前节点区暂时是干净的"}
          </p>
        </div>
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            分支情况
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {selectedNodeChoiceCount} 个选项
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {selectedNode
              ? selectedNodeHasJumpTargets
                ? `可跳到 ${selectedNodeTargets.length} 个目标节点`
                : "还没有有效跳转目标"
              : "选中节点后会显示分支概览"}
          </p>
        </div>
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            新增节点
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {newNodeReady ? "可以直接创建" : "先补 Key 和标题"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            基础信息先填够，再往下补背景、状态和 AI 提示词。
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  节点地图
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  先把主线、转折、结局铺开，再逐个精修节点文本和分支条件。
                </p>
              </div>
              {detail?.initialNodeId ? (
                <AdminBadge tone="accent">
                  起始节点：
                  {nodes.find((item) => item.id === detail.initialNodeId)
                    ?.title || "未命名节点"}
                </AdminBadge>
              ) : (
                <AdminBadge tone="warning">尚未设置起始节点</AdminBadge>
              )}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={nodeQuery}
                  onChange={(event) => setNodeQuery(event.target.value)}
                  placeholder="搜索节点标题、Key、分支文案"
                  className={cn(adminInputClassName, "pl-11")}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNodeQuery("");
                  setNodeFilterMode("all");
                }}
                disabled={!nodeQuery && nodeFilterMode === "all"}
              >
                清空筛选
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={openResequenceNodesConfirm}
                disabled={
                  !selectedStoryId || nodes.length === 0 || dirtyNodeCount > 0
                }
              >
                重排节点排序
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openResequenceChoicesConfirm(selectedNode?.id)}
                disabled={
                  !selectedNode ||
                  (selectedNode.choices?.length || 0) === 0 ||
                  dirtyNodeCount > 0
                }
              >
                重排当前节点选项
              </Button>
              {dirtyNodeCount > 0 ? (
                <span className="self-center text-xs text-amber-600">
                  发现未保存改动，先保存再重排
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {NODE_FILTERS.map((filter) => {
                const isActive = nodeFilterMode === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setNodeFilterMode(filter.value)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      isActive
                        ? "border-[color:var(--gush-border-strong)] bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
                        : "border-[color:var(--gush-border)] bg-white text-slate-500 hover:border-[color:var(--gush-border-strong)] hover:text-slate-950",
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminBadge>
                {filteredNodes.length} / {nodes.length} 个节点
              </AdminBadge>
              <AdminBadge tone={dirtyNodeCount > 0 ? "warning" : "default"}>
                {dirtyNodeCount} 个节点待保存
              </AdminBadge>
              <AdminBadge>
                {
                  nodes.filter((node) => (node.choices?.length || 0) === 0)
                    .length
                }{" "}
                个空分支
              </AdminBadge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {nodes.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-white px-4 py-10 text-sm leading-6 text-slate-500">
                  当前故事还没有节点。先在右侧创建第一个起始节点，再回来铺分支。
                </div>
              ) : filteredNodes.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-white px-4 py-10 text-sm leading-6 text-slate-500">
                  没有符合当前筛选条件的节点。换个关键词，或者把筛选切回“全部节点”。
                </div>
              ) : (
                filteredNodes.map((node) => {
                  const outgoingChoices = Array.isArray(node.choices)
                    ? node.choices
                    : [];
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedNodeId(node.id)}
                      className={cn(
                        "rounded-[24px] border bg-white px-4 py-4 text-left transition",
                        selectedNode?.id === node.id
                          ? "border-[color:var(--gush-border-strong)] shadow-[0_18px_36px_rgba(15,23,42,0.05)]"
                          : "border-[color:var(--gush-border)] hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {node.title}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {node.nodeKey}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <AdminBadge
                            tone={
                              detail?.initialNodeId === node.id
                                ? "accent"
                                : node.isEnding
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {detail?.initialNodeId === node.id
                              ? "起点"
                              : node.isEnding
                                ? "结局"
                                : `${outgoingChoices.length} 个选项`}
                          </AdminBadge>
                          {nodeDirtyById[node.id] ||
                          outgoingChoices.some(
                            (choice) => choiceDirtyById[choice.id],
                          ) ? (
                            <AdminBadge tone="warning">未保存</AdminBadge>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {outgoingChoices.length > 0 ? (
                          outgoingChoices.slice(0, 3).map((choice) => {
                            const targetNode = nodes.find(
                              (item) => item.id === choice.targetNodeId,
                            );
                            return (
                              <div
                                key={choice.id}
                                className="flex items-center gap-2 text-xs text-slate-500"
                              >
                                <ArrowRight className="size-3 shrink-0" />
                                <span className="truncate">{choice.label}</span>
                                <span className="truncate text-slate-400">
                                  {targetNode
                                    ? `→ ${targetNode.title}`
                                    : "→ 留在当前节点"}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400">
                            这个节点还没有选项。
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  新增节点
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  新节点先写基础剧情和 AI 提示词，细节字段稍后还能继续补。
                </p>
              </div>
              <AdminBadge>新建</AdminBadge>
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {selectedNode.title || "未命名节点"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedNode.nodeKey || "未设置节点 Key"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminBadge>{selectedNodeChoiceCount} 个选项</AdminBadge>
                    <AdminBadge>
                      {selectedNodeTargets.length} 个目标节点
                    </AdminBadge>
                    <AdminBadge
                      tone={selectedNode.aiEnabled ? "accent" : "default"}
                    >
                      {selectedNode.aiEnabled ? "AI 开启" : "AI 关闭"}
                    </AdminBadge>
                    {selectedNode.nodeKey ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await copyToClipboard(
                            selectedNode.nodeKey,
                          );
                          setFeedback({
                            type: ok ? "success" : "error",
                            message: ok
                              ? "已复制节点 Key"
                              : "复制失败，请手动选中复制",
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/70 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950"
                      >
                        <Copy className="size-3" />
                        复制 Key
                      </button>
                    ) : null}
                  </div>
                </div>
                {selectedNodeTargets.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedNodeTargets.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setSelectedNodeId(node.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:text-slate-950"
                      >
                        <ArrowRight className="size-3" />
                        跳到 {node.title}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField label="节点 Key">
                  <input
                    value={nodeDraft.nodeKey}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        nodeKey: event.target.value,
                      }))
                    }
                    className={adminInputClassName}
                    placeholder="intro-01"
                  />
                </AdminFormField>
                <AdminFormField label="节点标题">
                  <input
                    value={nodeDraft.title}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className={adminInputClassName}
                    placeholder="午夜来信"
                  />
                </AdminFormField>
                <AdminFormField label="排序">
                  <input
                    type="number"
                    value={nodeDraft.sortOrder}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                    className={adminInputClassName}
                  />
                </AdminFormField>
                <AdminFormField
                  label="回退文案"
                  helperText="AI 生成失败时返回给读者的保底文本。"
                >
                  <input
                    value={nodeDraft.fallbackText}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        fallbackText: event.target.value,
                      }))
                    }
                    className={adminInputClassName}
                    placeholder="夜风吹动窗帘，你决定先稳住情绪再观察四周。"
                  />
                </AdminFormField>
              </div>
              <AdminFormField label="节点剧情背景">
                <textarea
                  rows={5}
                  value={nodeDraft.baseContext}
                  onChange={(event) =>
                    setNodeDraft((current) => ({
                      ...current,
                      baseContext: event.target.value,
                    }))
                  }
                  className={adminTextareaClassName}
                  placeholder="这一节点发生了什么，读者掌握了哪些信息。"
                />
              </AdminFormField>
              <AdminFormField label="节点 AI 提示词">
                <textarea
                  rows={5}
                  value={nodeDraft.basePrompt}
                  onChange={(event) =>
                    setNodeDraft((current) => ({
                      ...current,
                      basePrompt: event.target.value,
                    }))
                  }
                  className={adminTextareaClassName}
                  placeholder="告诉 AI 这一段的情绪、镜头感和必须提到的关键点。"
                />
              </AdminFormField>
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField
                  label="必需标记"
                  helperText="逗号或换行分隔，例如 met_editor, unlocked_note。"
                >
                  <textarea
                    rows={4}
                    value={nodeDraft.requiredFlagsText}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        requiredFlagsText: event.target.value,
                      }))
                    }
                    className={adminTextareaClassName}
                    placeholder="clue_found, met_editor"
                  />
                </AdminFormField>
                <AdminFormField
                  label="屏蔽标记"
                  helperText="命中这些标记时，该节点不应被访问。"
                >
                  <textarea
                    rows={4}
                    value={nodeDraft.blockedFlagsText}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        blockedFlagsText: event.target.value,
                      }))
                    }
                    className={adminTextareaClassName}
                    placeholder="bad_ending"
                  />
                </AdminFormField>
              </div>
              <AdminFormField
                label="节点状态变更 JSON"
                helperText='例如 {"trust": 1, "flagsAdd": ["met_editor"]}。'
              >
                <textarea
                  rows={5}
                  value={nodeDraft.stateEffectsText}
                  onChange={(event) =>
                    setNodeDraft((current) => ({
                      ...current,
                      stateEffectsText: event.target.value,
                    }))
                  }
                  className={adminTextareaClassName}
                  placeholder='{"trust": 1, "risk": -1}'
                />
              </AdminFormField>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={nodeDraft.isEnding}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        isEnding: event.target.checked,
                      }))
                    }
                    className={adminCheckboxClassName}
                  />
                  结局节点
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={nodeDraft.aiEnabled}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        aiEnabled: event.target.checked,
                      }))
                    }
                    className={adminCheckboxClassName}
                  />
                  节点启用 AI
                </label>
              </div>
              <Button onClick={createNode} disabled={!selectedStoryId}>
                <Plus className="size-4" />
                创建节点
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  节点编辑器
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  选中一个节点后，在这里编辑它的正文约束、条件和状态变更。
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {selectedNode ? (
                  <AdminBadge
                    tone={
                      detail?.initialNodeId === selectedNode.id
                        ? "accent"
                        : selectedNode.isEnding
                          ? "warning"
                          : "default"
                    }
                  >
                    {detail?.initialNodeId === selectedNode.id
                      ? "起始节点"
                      : selectedNode.isEnding
                        ? "结局节点"
                        : "普通节点"}
                  </AdminBadge>
                ) : null}
                {selectedNode && selectedNodeDirty ? (
                  <AdminBadge tone="warning">节点未保存</AdminBadge>
                ) : null}
                {selectedChoiceDirtyCount > 0 ? (
                  <AdminBadge tone="warning">
                    {selectedChoiceDirtyCount} 个分支待保存
                  </AdminBadge>
                ) : null}
              </div>
            </div>

            {!selectedNode ? (
              <p className="mt-4 text-sm leading-6 text-slate-500">
                先从左边节点地图里选中一个节点。
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {selectedNode.title || "未命名节点"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedNode.nodeKey || "未设置节点 Key"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AdminBadge>
                        {selectedNode.choices?.length || 0} 个选项
                      </AdminBadge>
                      <AdminBadge>
                        {selectedNodeTargets.length} 个目标节点
                      </AdminBadge>
                      <AdminBadge
                        tone={selectedNode.aiEnabled ? "accent" : "default"}
                      >
                        {selectedNode.aiEnabled ? "AI 开启" : "AI 关闭"}
                      </AdminBadge>
                    </div>
                  </div>
                  {selectedNodeTargets.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedNodeTargets.map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setSelectedNodeId(node.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-[color:var(--gush-border)] bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:text-slate-950"
                        >
                          <ArrowRight className="size-3" />
                          跳到 {node.title}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminFormField label="节点 Key">
                    <input
                      value={selectedNodeForm.nodeKey}
                      onChange={(event) =>
                        setNodeForms((current) => ({
                          ...current,
                          [selectedNode.id]: {
                            ...selectedNodeForm,
                            nodeKey: event.target.value,
                          },
                        }))
                      }
                      className={adminInputClassName}
                    />
                  </AdminFormField>
                  <AdminFormField label="节点标题">
                    <input
                      value={selectedNodeForm.title}
                      onChange={(event) =>
                        setNodeForms((current) => ({
                          ...current,
                          [selectedNode.id]: {
                            ...selectedNodeForm,
                            title: event.target.value,
                          },
                        }))
                      }
                      className={adminInputClassName}
                    />
                  </AdminFormField>
                  <AdminFormField label="排序">
                    <input
                      type="number"
                      value={selectedNodeForm.sortOrder}
                      onChange={(event) =>
                        setNodeForms((current) => ({
                          ...current,
                          [selectedNode.id]: {
                            ...selectedNodeForm,
                            sortOrder: event.target.value,
                          },
                        }))
                      }
                      className={adminInputClassName}
                    />
                  </AdminFormField>
                  <AdminFormField label="回退文案">
                    <input
                      value={selectedNodeForm.fallbackText}
                      onChange={(event) =>
                        setNodeForms((current) => ({
                          ...current,
                          [selectedNode.id]: {
                            ...selectedNodeForm,
                            fallbackText: event.target.value,
                          },
                        }))
                      }
                      className={adminInputClassName}
                    />
                  </AdminFormField>
                </div>
                <AdminFormField label="节点剧情背景">
                  <textarea
                    rows={5}
                    value={selectedNodeForm.baseContext}
                    onChange={(event) =>
                      setNodeForms((current) => ({
                        ...current,
                        [selectedNode.id]: {
                          ...selectedNodeForm,
                          baseContext: event.target.value,
                        },
                      }))
                    }
                    className={adminTextareaClassName}
                  />
                </AdminFormField>
                <AdminFormField label="节点 AI 提示词">
                  <textarea
                    rows={5}
                    value={selectedNodeForm.basePrompt}
                    onChange={(event) =>
                      setNodeForms((current) => ({
                        ...current,
                        [selectedNode.id]: {
                          ...selectedNodeForm,
                          basePrompt: event.target.value,
                        },
                      }))
                    }
                    className={adminTextareaClassName}
                  />
                </AdminFormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <AdminFormField label="必需标记">
                    <textarea
                      rows={4}
                      value={selectedNodeForm.requiredFlagsText}
                      onChange={(event) =>
                        setNodeForms((current) => ({
                          ...current,
                          [selectedNode.id]: {
                            ...selectedNodeForm,
                            requiredFlagsText: event.target.value,
                          },
                        }))
                      }
                      className={adminTextareaClassName}
                    />
                  </AdminFormField>
                  <AdminFormField label="屏蔽标记">
                    <textarea
                      rows={4}
                      value={selectedNodeForm.blockedFlagsText}
                      onChange={(event) =>
                        setNodeForms((current) => ({
                          ...current,
                          [selectedNode.id]: {
                            ...selectedNodeForm,
                            blockedFlagsText: event.target.value,
                          },
                        }))
                      }
                      className={adminTextareaClassName}
                    />
                  </AdminFormField>
                </div>
                <AdminFormField label="节点状态变更 JSON">
                  <textarea
                    rows={5}
                    value={selectedNodeForm.stateEffectsText}
                    onChange={(event) =>
                      setNodeForms((current) => ({
                        ...current,
                        [selectedNode.id]: {
                          ...selectedNodeForm,
                          stateEffectsText: event.target.value,
                        },
                      }))
                    }
                    className={adminTextareaClassName}
                  />
                </AdminFormField>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedNodeForm.isEnding}
                      onChange={(event) =>
                        setNodeForms((current) => ({
                          ...current,
                          [selectedNode.id]: {
                            ...selectedNodeForm,
                            isEnding: event.target.checked,
                          },
                        }))
                      }
                      className={adminCheckboxClassName}
                    />
                    结局节点
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedNodeForm.aiEnabled}
                      onChange={(event) =>
                        setNodeForms((current) => ({
                          ...current,
                          [selectedNode.id]: {
                            ...selectedNodeForm,
                            aiEnabled: event.target.checked,
                          },
                        }))
                      }
                      className={adminCheckboxClassName}
                    />
                    启用 AI
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => saveNode(selectedNode.id)}>
                    <Save className="size-4" />
                    保存节点
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStartNode(selectedNode.id)}
                  >
                    设为起始节点
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => duplicateNode(selectedNode.id)}
                  >
                    <Copy className="size-4" />
                    复制节点
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeNode(selectedNode.id)}
                  >
                    <Trash2 className="size-4" />
                    删除节点
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  分支编辑器
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  每个选项都能写说明、条件、状态变更和跳转目标，别再只有一个按钮文案了。
                </p>
              </div>
              {selectedNode ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AdminBadge>
                    {selectedNode.choices?.length || 0} 个选项
                  </AdminBadge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      openResequenceChoicesConfirm(selectedNode.id)
                    }
                    disabled={
                      (selectedNode.choices?.length || 0) === 0 ||
                      dirtyNodeCount > 0
                    }
                  >
                    重排选项
                  </Button>
                </div>
              ) : null}
            </div>

            {!selectedNode ? (
              <p className="mt-4 text-sm leading-6 text-slate-500">
                先选中一个节点，再配置它的选项。
              </p>
            ) : selectedNodeChoiceCount === 0 ? (
              <div className="mt-4 rounded-[22px] border border-dashed border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-4 py-6 text-sm leading-6 text-slate-500">
                这个节点现在还是单点场景。先在下面补一个新选项，再决定要不要跳到别的节点。
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {(selectedNode.choices || []).map((choice) => {
                  const form = choiceForms[choice.id] || emptyChoice();
                  const targetNode = nodes.find(
                    (node) => node.id === form.targetNodeId,
                  );
                  return (
                    <div
                      key={choice.id}
                      className="rounded-[22px] border border-[color:var(--gush-border)] p-4"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {form.label || "未命名选项"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {form.choiceKey || "还没填写选项 Key"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <AdminBadge>
                            {targetNode
                              ? `跳到 ${targetNode.title}`
                              : "留在当前节点"}
                          </AdminBadge>
                          {choiceDirtyById[choice.id] ? (
                            <AdminBadge tone="warning">未保存</AdminBadge>
                          ) : null}
                          {form.choiceKey ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await copyToClipboard(
                                  form.choiceKey,
                                );
                                setFeedback({
                                  type: ok ? "success" : "error",
                                  message: ok
                                    ? "已复制选项 Key"
                                    : "复制失败，请手动选中复制",
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/70 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950"
                            >
                              <Copy className="size-3" />
                              复制 Key
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <AdminFormField label="选项 Key">
                            <input
                              value={form.choiceKey}
                              onChange={(event) =>
                                setChoiceForms((current) => ({
                                  ...current,
                                  [choice.id]: {
                                    ...form,
                                    choiceKey: event.target.value,
                                  },
                                }))
                              }
                              className={adminInputClassName}
                            />
                          </AdminFormField>
                          <AdminFormField label="按钮文案">
                            <input
                              value={form.label}
                              onChange={(event) =>
                                setChoiceForms((current) => ({
                                  ...current,
                                  [choice.id]: {
                                    ...form,
                                    label: event.target.value,
                                  },
                                }))
                              }
                              className={adminInputClassName}
                            />
                          </AdminFormField>
                          <AdminFormField label="跳转节点">
                            <select
                              value={form.targetNodeId || ""}
                              onChange={(event) =>
                                setChoiceForms((current) => ({
                                  ...current,
                                  [choice.id]: {
                                    ...form,
                                    targetNodeId: event.target.value,
                                  },
                                }))
                              }
                              className={adminSelectClassName}
                            >
                              <option value="">不跳转，留在当前节点</option>
                              {nodes.map((node) => (
                                <option key={node.id} value={node.id}>
                                  {node.nodeKey} · {node.title}
                                </option>
                              ))}
                            </select>
                            {!form.targetNodeId ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void createTargetNodeForChoice(
                                      choice.id,
                                      selectedNode,
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/70 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950"
                                >
                                  <Plus className="size-3" />
                                  新建目标节点
                                </button>
                              </div>
                            ) : null}
                          </AdminFormField>
                          <AdminFormField label="排序">
                            <input
                              type="number"
                              value={form.sortOrder}
                              onChange={(event) =>
                                setChoiceForms((current) => ({
                                  ...current,
                                  [choice.id]: {
                                    ...form,
                                    sortOrder: event.target.value,
                                  },
                                }))
                              }
                              className={adminInputClassName}
                            />
                          </AdminFormField>
                        </div>
                        <AdminFormField label="选项说明">
                          <textarea
                            rows={3}
                            value={form.description}
                            onChange={(event) =>
                              setChoiceForms((current) => ({
                                ...current,
                                [choice.id]: {
                                  ...form,
                                  description: event.target.value,
                                },
                              }))
                            }
                            className={adminTextareaClassName}
                            placeholder="给运营或作者看的说明，也可以用于导出时保留备注。"
                          />
                        </AdminFormField>
                        <div className="grid gap-4 md:grid-cols-2">
                          <AdminFormField label="必需标记">
                            <textarea
                              rows={3}
                              value={form.requiredFlagsText}
                              onChange={(event) =>
                                setChoiceForms((current) => ({
                                  ...current,
                                  [choice.id]: {
                                    ...form,
                                    requiredFlagsText: event.target.value,
                                  },
                                }))
                              }
                              className={adminTextareaClassName}
                            />
                          </AdminFormField>
                          <AdminFormField label="屏蔽标记">
                            <textarea
                              rows={3}
                              value={form.blockedFlagsText}
                              onChange={(event) =>
                                setChoiceForms((current) => ({
                                  ...current,
                                  [choice.id]: {
                                    ...form,
                                    blockedFlagsText: event.target.value,
                                  },
                                }))
                              }
                              className={adminTextareaClassName}
                            />
                          </AdminFormField>
                        </div>
                        <AdminFormField label="选项状态变更 JSON">
                          <textarea
                            rows={4}
                            value={form.stateEffectsText}
                            onChange={(event) =>
                              setChoiceForms((current) => ({
                                ...current,
                                [choice.id]: {
                                  ...form,
                                  stateEffectsText: event.target.value,
                                },
                              }))
                            }
                            className={adminTextareaClassName}
                          />
                        </AdminFormField>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveChoice(choice.id)}
                          >
                            <Save className="size-4" />
                            保存
                          </Button>
                          {form.targetNodeId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setSelectedNodeId(form.targetNodeId)
                              }
                            >
                              <ArrowRight className="size-4" />
                              去目标节点
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeChoice(choice.id)}
                          >
                            <Trash2 className="size-4" />
                            删除
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="rounded-[22px] border border-dashed border-[color:var(--gush-border)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        新增选项
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        在这里补一个新的分支入口。
                      </p>
                    </div>
                    <AdminBadge tone="accent">新分支</AdminBadge>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <AdminFormField label="选项 Key">
                        <input
                          value={
                            (newChoiceByNode[selectedNode.id] || emptyChoice())
                              .choiceKey
                          }
                          onChange={(event) =>
                            setNewChoiceByNode((current) => ({
                              ...current,
                              [selectedNode.id]: {
                                ...(current[selectedNode.id] || emptyChoice()),
                                choiceKey: event.target.value,
                              },
                            }))
                          }
                          className={adminInputClassName}
                          placeholder="ask-editor"
                        />
                      </AdminFormField>
                      <AdminFormField label="按钮文案">
                        <input
                          value={
                            (newChoiceByNode[selectedNode.id] || emptyChoice())
                              .label
                          }
                          onChange={(event) =>
                            setNewChoiceByNode((current) => ({
                              ...current,
                              [selectedNode.id]: {
                                ...(current[selectedNode.id] || emptyChoice()),
                                label: event.target.value,
                              },
                            }))
                          }
                          className={adminInputClassName}
                          placeholder="直接去问编辑"
                        />
                      </AdminFormField>
                      <AdminFormField label="跳转节点">
                        <select
                          value={
                            (newChoiceByNode[selectedNode.id] || emptyChoice())
                              .targetNodeId || ""
                          }
                          onChange={(event) =>
                            setNewChoiceByNode((current) => ({
                              ...current,
                              [selectedNode.id]: {
                                ...(current[selectedNode.id] || emptyChoice()),
                                targetNodeId: event.target.value,
                              },
                            }))
                          }
                          className={adminSelectClassName}
                        >
                          <option value="">不跳转，留在当前节点</option>
                          {nodes.map((node) => (
                            <option key={node.id} value={node.id}>
                              {node.nodeKey} · {node.title}
                            </option>
                          ))}
                        </select>
                      </AdminFormField>
                      <AdminFormField label="排序">
                        <input
                          type="number"
                          value={
                            (newChoiceByNode[selectedNode.id] || emptyChoice())
                              .sortOrder
                          }
                          onChange={(event) =>
                            setNewChoiceByNode((current) => ({
                              ...current,
                              [selectedNode.id]: {
                                ...(current[selectedNode.id] || emptyChoice()),
                                sortOrder: event.target.value,
                              },
                            }))
                          }
                          className={adminInputClassName}
                        />
                      </AdminFormField>
                    </div>
                    <AdminFormField label="选项说明">
                      <textarea
                        rows={3}
                        value={
                          (newChoiceByNode[selectedNode.id] || emptyChoice())
                            .description
                        }
                        onChange={(event) =>
                          setNewChoiceByNode((current) => ({
                            ...current,
                            [selectedNode.id]: {
                              ...(current[selectedNode.id] || emptyChoice()),
                              description: event.target.value,
                            },
                          }))
                        }
                        className={adminTextareaClassName}
                      />
                    </AdminFormField>
                    <div className="grid gap-4 md:grid-cols-2">
                      <AdminFormField label="必需标记">
                        <textarea
                          rows={3}
                          value={
                            (newChoiceByNode[selectedNode.id] || emptyChoice())
                              .requiredFlagsText
                          }
                          onChange={(event) =>
                            setNewChoiceByNode((current) => ({
                              ...current,
                              [selectedNode.id]: {
                                ...(current[selectedNode.id] || emptyChoice()),
                                requiredFlagsText: event.target.value,
                              },
                            }))
                          }
                          className={adminTextareaClassName}
                        />
                      </AdminFormField>
                      <AdminFormField label="屏蔽标记">
                        <textarea
                          rows={3}
                          value={
                            (newChoiceByNode[selectedNode.id] || emptyChoice())
                              .blockedFlagsText
                          }
                          onChange={(event) =>
                            setNewChoiceByNode((current) => ({
                              ...current,
                              [selectedNode.id]: {
                                ...(current[selectedNode.id] || emptyChoice()),
                                blockedFlagsText: event.target.value,
                              },
                            }))
                          }
                          className={adminTextareaClassName}
                        />
                      </AdminFormField>
                    </div>
                    <AdminFormField label="选项状态变更 JSON">
                      <textarea
                        rows={4}
                        value={
                          (newChoiceByNode[selectedNode.id] || emptyChoice())
                            .stateEffectsText
                        }
                        onChange={(event) =>
                          setNewChoiceByNode((current) => ({
                            ...current,
                            [selectedNode.id]: {
                              ...(current[selectedNode.id] || emptyChoice()),
                              stateEffectsText: event.target.value,
                            },
                          }))
                        }
                        className={adminTextareaClassName}
                      />
                    </AdminFormField>
                    <Button
                      size="sm"
                      onClick={() => addChoice(selectedNode.id)}
                    >
                      <Plus className="size-4" />
                      添加这个选项
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
