"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, FileJson, RefreshCw } from "lucide-react";
import AdminShell from "./AdminShell";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/common/Modal";
import { useAdminAuth } from "./AuthContext";
import {
  AdminMetricCard,
  AdminPageSection,
  AdminTabs,
} from "./common/AdminWorkspacePrimitives";
import { cn } from "@/lib/utils";
import InteractiveStoryJsonTab from "./interactive-stories/InteractiveStoryJsonTab";
import InteractiveStoryNodesTab from "./interactive-stories/InteractiveStoryNodesTab";
import InteractiveStoryStoryTab from "./interactive-stories/InteractiveStoryStoryTab";
import InteractiveStoryLibrarySection from "./interactive-stories/InteractiveStoryLibrarySection";
import InteractiveStoryInsightsSection from "./interactive-stories/InteractiveStoryInsightsSection";
import useInteractiveStoryAdminBootstrap from "./interactive-stories/useInteractiveStoryAdminBootstrap";
import useInteractiveStoryConfirmDialog from "./interactive-stories/useInteractiveStoryConfirmDialog";
import useInteractiveStoryAdminMutations from "./interactive-stories/useInteractiveStoryAdminMutations";
import {
  compareFormState,
  emptyChoice,
  emptyNode,
  emptyStory,
  mapChoiceToForm,
  mapNodeToForm,
  mapStoryToForm,
  summarizeStateKeys,
} from "./interactive-stories/formState";

const TABS = [
  { value: "story", label: "Story" },
  { value: "nodes", label: "Nodes" },
  { value: "json", label: "JSON" },
];

const NODE_FILTERS = [
  { value: "all", label: "All" },
  { value: "start", label: "Start" },
  { value: "ending", label: "Ending" },
  { value: "withChoices", label: "Has Choices" },
  { value: "empty", label: "No Choices" },
  { value: "dirty", label: "Unsaved" },
];

function getValidationTone(validation) {
  if (!validation) return "default";
  if (validation.errors > 0) return "danger";
  if (validation.warnings > 0) return "warning";
  return "success";
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

export default function AdminInteractiveStoriesPage({
  initialStoryId = "",
  initialActiveTab = "story",
  startInCreateMode = false,
} = {}) {
  const router = useRouter();
  const normalizedInitialStoryId = String(initialStoryId || "").trim();
  const normalizedInitialActiveTab = TABS.some(
    (item) => item.value === initialActiveTab,
  )
    ? initialActiveTab
    : "story";
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [stories, setStories] = useState([]);
  const [selectedStoryId, setSelectedStoryId] = useState(() =>
    startInCreateMode ? "" : normalizedInitialStoryId,
  );
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [activeTab, setActiveTab] = useState(() =>
    startInCreateMode ? "story" : normalizedInitialActiveTab,
  );
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
  const [panelReviewForms, setPanelReviewForms] = useState({});
  const [newChoiceByNode, setNewChoiceByNode] = useState({});
  const [importMode, setImportMode] = useState("create");
  const [importText, setImportText] = useState("");

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
          story.coverImage ||
          story.genre ||
          story.contentMode !== "normal" ||
          story.status !== "draft" ||
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
    const slugValue = String(story.slug || detail?.slug || "").trim();
    return slugValue ? `/interactive/${encodeURIComponent(slugValue)}` : "";
  }, [detail?.slug, story.slug]);

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
      message: ok ? successMessage : "Copy failed. Please copy the link manually.",
    });
  }, []);

  const {
    loadStories,
    loadDetail,
    loadValidation,
    resetToNewStory,
    exportStory,
    copyStoryJson,
    fillImportTemplate,
    importStory,
  } = useInteractiveStoryAdminBootstrap({
    router,
    isAuthenticated,
    isLoading,
    normalizedInitialStoryId,
    normalizedInitialActiveTab,
    startInCreateMode,
    activeTab,
    setActiveTab,
    selectedStoryId,
    setSelectedStoryId,
    setSelectedNodeId,
    setStories,
    setStory,
    setNodeDraft,
    setNodeForms,
    setChoiceForms,
    setPanelReviewForms,
    setNewChoiceByNode,
    setDetail,
    setValidation,
    setFeedback,
    setLoading,
    setBusy,
    importMode,
    setImportMode,
    importText,
    setImportText,
    copyToClipboard,
  });

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
          message: `Node key not found: ${normalizedKey}`,
        });
        return;
      }
      setSelectedNodeId(target.id);
    },
    [nodes],
  );

  const {
    saveStory,
    createStory,
    publishStory,
    removeStory,
    createNode,
    saveNode,
    setStartNode,
    removeNode,
    saveChoice,
    attachChoiceToNode,
    createTargetNodeForChoice,
    addChoice,
    generateNextNode,
    generateStoryboardForNode,
    generatePanelsForNode,
    approvePanel,
    rejectPanel,
    regeneratePanel,
    removeChoice,
    duplicateNode,
    resequenceNodesNow,
    resequenceChoicesNow,
  } = useInteractiveStoryAdminMutations({
    selectedStoryId,
    story,
    nodes,
    nodeDraft,
    nodeForms,
    choiceForms,
    panelReviewForms,
    newChoiceByNode,
    dirtyNodeCount,
    choiceDirtyById,
    setBusy,
    setFeedback,
    setStory,
    setNodeDraft,
    setNodeForms,
    setNewChoiceByNode,
    setSelectedStoryId,
    setSelectedNodeId,
    setActiveTab,
    loadStories,
    loadDetail,
    resetToNewStory,
  });

  const {
    confirmDialog,
    closeConfirmDialog,
    openResequenceNodesConfirm,
    openResequenceChoicesConfirm,
    openRemoveStoryConfirm,
    openRemoveNodeConfirm,
    openRemoveChoiceConfirm,
  } = useInteractiveStoryConfirmDialog({
    selectedStoryId,
    resequenceNodesNow,
    resequenceChoicesNow,
    removeStory,
    removeNode,
    removeChoice,
  });

  const selectedStorySummary = detail
    ? [
        { label: "Series", value: detail.series?.title || "Unlinked" },
        {
          label: "Start Node",
          value:
            nodes.find((item) => item.id === detail.initialNodeId)?.title ||
            "Not set",
        },
        {
          label: "AI Assist",
          value: detail.aiEnabled ? "Enabled" : "Disabled",
        },
        {
          label: "State Keys",
          value: stateKeys.length > 0 ? stateKeys.join(" / ") : "None",
        },
      ]
    : [];

  return (
    <AdminShell
      title="Interactive Story Studio"
      subtitle="Manage setup, branching, AI review, validation, and publishing from one workspace."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => loadDetail(selectedStoryId)}
            disabled={!selectedStoryId}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={fillImportTemplate}>
            <FileJson className="size-4" />
            Template
          </Button>
          {selectedStoryId ? (
            <>
              <Button variant="outline" onClick={copyStoryJson}>
                <Copy className="size-4" />
                Copy JSON
              </Button>
              <Button variant="outline" onClick={exportStory}>
                <Download className="size-4" />
                Export
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
                : feedback.type === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {feedback.message}
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Nodes"
            value={nodes.length}
            detail="Narrative nodes currently defined in this story graph."
          />
          <AdminMetricCard
            label="Choices"
            value={nodes.reduce(
              (sum, node) => sum + (node.choices?.length || 0),
              0,
            )}
            detail="Total branch choices across all nodes."
          />
          <AdminMetricCard
            label="Endings"
            value={nodes.filter((node) => node.isEnding).length}
            detail="Nodes currently marked as ending beats."
          />
          <AdminMetricCard
            label="Validation"
            value={validation?.ok ? "Ready" : "Needs Work"}
            detail={
              validation
                ? `Errors ${validation.errors} / Warnings ${validation.warnings}`
                : "Run one validation pass before publishing."
            }
            tone={validation?.ok ? "accent" : "default"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
          <InteractiveStoryLibrarySection
            storyQuery={storyQuery}
            setStoryQuery={setStoryQuery}
            resetToNewStory={resetToNewStory}
            loading={loading}
            filteredStories={filteredStories}
            selectedStoryId={selectedStoryId}
            setSelectedStoryId={setSelectedStoryId}
            setActiveTab={setActiveTab}
          />

          <div className="space-y-6">
            <AdminPageSection
              title={
                selectedStoryId ? detail?.title || "Story Workspace" : "Create a New Story"
              }
              description={
                selectedStoryId
                  ? "Set world rules and the initial state here, then move into node, branch, and review work."
                  : "Create the story shell here, then continue into the node editor."
              }
              action={<AdminTabs items={TABS} value={activeTab} onChange={setActiveTab} />}
            >
              {activeTab === "story" ? (
                <InteractiveStoryStoryTab
                  story={story}
                  setStory={setStory}
                  selectedStoryId={selectedStoryId}
                  storyDirty={storyDirty}
                  busy={busy}
                  validation={validation}
                  validationTone={validationTone}
                  selectedStorySummary={selectedStorySummary}
                  publicInteractiveHref={publicInteractiveHref}
                  publicSeriesHref={publicSeriesHref}
                  openPublicHref={openPublicHref}
                  copyPublicHref={copyPublicHref}
                  saveStory={saveStory}
                  createStory={createStory}
                  loadValidation={loadValidation}
                  publishStory={publishStory}
                  openRemoveStoryConfirm={openRemoveStoryConfirm}
                />
              ) : null}
              {activeTab === "json" ? (
                <InteractiveStoryJsonTab
                  importMode={importMode}
                  setImportMode={setImportMode}
                  importText={importText}
                  setImportText={setImportText}
                  importStory={importStory}
                  busy={busy}
                  selectedStoryId={selectedStoryId}
                  exportStory={exportStory}
                />
              ) : null}
              {activeTab === "nodes" ? (
                <InteractiveStoryNodesTab
                  detail={detail}
                  nodes={nodes}
                  filteredNodes={filteredNodes}
                  busy={busy}
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
                  panelReviewForms={panelReviewForms}
                  setPanelReviewForms={setPanelReviewForms}
                  newChoiceByNode={newChoiceByNode}
                  setNewChoiceByNode={setNewChoiceByNode}
                  saveChoice={saveChoice}
                  attachChoiceToNode={attachChoiceToNode}
                  removeChoice={openRemoveChoiceConfirm}
                  addChoice={addChoice}
                  generateNextNode={generateNextNode}
                  generateStoryboardForNode={generateStoryboardForNode}
                  generatePanelsForNode={generatePanelsForNode}
                  approvePanel={approvePanel}
                  rejectPanel={rejectPanel}
                  regeneratePanel={regeneratePanel}
                  setFeedback={setFeedback}
                  copyToClipboard={copyToClipboard}
                  createTargetNodeForChoice={createTargetNodeForChoice}
                  nodeFilters={NODE_FILTERS}
                />
              ) : null}
            </AdminPageSection>

            <InteractiveStoryInsightsSection
              validation={validation}
              jumpToNodeKey={jumpToNodeKey}
            />
          </div>
        </div>
      </div>
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText="Cancel"
        variant={confirmDialog.variant}
      />
    </AdminShell>
  );
}
