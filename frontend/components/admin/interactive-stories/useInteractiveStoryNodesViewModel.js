"use client";

import { useMemo } from "react";

export default function useInteractiveStoryNodesViewModel({
  detail,
  nodes,
  filteredNodes,
  busy,
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
  panelReviewForms,
  setPanelReviewForms,
  newChoiceByNode,
  setNewChoiceByNode,
  saveChoice,
  attachChoiceToNode,
  removeChoice,
  addChoice,
  generateNextNode,
  generateStoryboardForNode,
  generatePanelsForNode,
  approvePanel,
  rejectPanel,
  regeneratePanel,
  setFeedback,
  copyToClipboard,
  createTargetNodeForChoice,
  nodeFilters,
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
  const generationLogs = Array.isArray(detail?.generationLogs)
    ? detail.generationLogs
    : [];
  const selectedNodeGenerationLog = selectedNode
    ? generationLogs.find((item) => item?.nodeId === selectedNode.id) || null
    : null;
  const selectedNodeSourceChoiceId =
    selectedNodeGenerationLog?.choice?.id ||
    selectedNodeGenerationLog?.choiceId ||
    "";
  const selectedNodeApproved =
    (selectedNode?.reviewStatus || "approved") === "approved";

  const selectedPanels = useMemo(
    () =>
      Array.isArray(selectedNode?.panels)
        ? [...selectedNode.panels].sort(
            (left, right) =>
              Number(left?.panelNumber || 0) - Number(right?.panelNumber || 0),
          )
        : [],
    [selectedNode],
  );

  const selectedPanelPendingCount = useMemo(
    () =>
      selectedPanels.filter(
        (panel) => String(panel?.reviewStatus || "").trim() === "pending_review",
      ).length,
    [selectedPanels],
  );

  const nodeMapSectionProps = {
    detail,
    nodes,
    filteredNodes,
    selectedNode,
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
    selectedNodeTargets,
    selectedNodeChoiceCount,
    openResequenceNodesConfirm,
    openResequenceChoicesConfirm,
    copyToClipboard,
    setFeedback,
    nodeFilters,
  };

  const nodeEditorSectionProps = {
    detail,
    selectedNode,
    selectedNodeForm,
    selectedNodeDirty,
    selectedChoiceDirtyCount,
    selectedNodeTargets,
    selectedNodeSourceChoiceId,
    selectedNodeApproved,
    setSelectedNodeId,
    setNodeForms,
    saveNode,
    setStartNode,
    duplicateNode,
    removeNode,
    attachChoiceToNode,
  };

  const panelsSectionProps = {
    busy,
    selectedNode,
    selectedPanels,
    selectedPanelPendingCount,
    panelReviewForms,
    setPanelReviewForms,
    generateStoryboardForNode,
    generatePanelsForNode,
    approvePanel,
    rejectPanel,
    regeneratePanel,
  };

  const branchEditorSectionProps = {
    nodes,
    busy,
    selectedNode,
    selectedNodeChoiceCount,
    dirtyNodeCount,
    choiceForms,
    setChoiceForms,
    choiceDirtyById,
    newChoiceByNode,
    setNewChoiceByNode,
    saveChoice,
    attachChoiceToNode,
    removeChoice,
    addChoice,
    setSelectedNodeId,
    openResequenceChoicesConfirm,
    generateNextNode,
    generationLogs,
    createTargetNodeForChoice,
    copyToClipboard,
    setFeedback,
  };

  return {
    nodeMapSectionProps,
    nodeEditorSectionProps,
    panelsSectionProps,
    branchEditorSectionProps,
  };
}
