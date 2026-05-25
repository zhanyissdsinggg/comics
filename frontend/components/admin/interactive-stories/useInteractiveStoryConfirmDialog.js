"use client";

import { useCallback, useState } from "react";

const DEFAULT_CONFIRM_DIALOG = {
  isOpen: false,
  title: "",
  message: "",
  confirmText: "Confirm",
  variant: "danger",
  onConfirm: null,
};

export default function useInteractiveStoryConfirmDialog({
  selectedStoryId,
  resequenceNodesNow,
  resequenceChoicesNow,
  removeStory,
  removeNode,
  removeChoice,
}) {
  const [confirmDialog, setConfirmDialog] = useState(DEFAULT_CONFIRM_DIALOG);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog((current) => ({
      ...current,
      isOpen: false,
    }));
  }, []);

  const openResequenceNodesConfirm = useCallback(() => {
    if (!selectedStoryId) return;
    setConfirmDialog({
      isOpen: true,
      title: "Resequence Nodes",
      message:
        "This will renumber saved node sortOrder values to 10/20/30... Save all pending changes first.",
      confirmText: "Resequence",
      variant: "warning",
      onConfirm: () => resequenceNodesNow(),
    });
  }, [resequenceNodesNow, selectedStoryId]);

  const openResequenceChoicesConfirm = useCallback(
    (nodeId) => {
      if (!selectedStoryId || !nodeId) return;
      setConfirmDialog({
        isOpen: true,
        title: "Resequence Choices",
        message:
          "This will renumber saved choice sortOrder values to 10/20/30... Save all pending changes first.",
        confirmText: "Resequence",
        variant: "warning",
        onConfirm: () => resequenceChoicesNow(nodeId),
      });
    },
    [resequenceChoicesNow, selectedStoryId],
  );

  const openRemoveStoryConfirm = useCallback(() => {
    if (!selectedStoryId) return;
    setConfirmDialog({
      isOpen: true,
      title: "Delete Interactive Story",
      message:
        "Delete the current story? Nodes, choices, and saved reader progress will all be invalidated.",
      confirmText: "Delete Story",
      variant: "danger",
      onConfirm: () => {
        void removeStory();
      },
    });
  }, [removeStory, selectedStoryId]);

  const openRemoveNodeConfirm = useCallback(
    (nodeId) => {
      if (!nodeId) return;
      setConfirmDialog({
        isOpen: true,
        title: "Delete Node",
        message:
          "Delete this node? The system will clean up affected branch references, but the node content itself will not be preserved.",
        confirmText: "Delete Node",
        variant: "danger",
        onConfirm: () => {
          void removeNode(nodeId);
        },
      });
    },
    [removeNode],
  );

  const openRemoveChoiceConfirm = useCallback(
    (choiceId) => {
      if (!choiceId) return;
      setConfirmDialog({
        isOpen: true,
        title: "Delete Choice",
        message:
          "Delete this choice? The current node's branch path will change immediately.",
        confirmText: "Delete Choice",
        variant: "danger",
        onConfirm: () => {
          void removeChoice(choiceId);
        },
      });
    },
    [removeChoice],
  );

  return {
    confirmDialog,
    closeConfirmDialog,
    openResequenceNodesConfirm,
    openResequenceChoicesConfirm,
    openRemoveStoryConfirm,
    openRemoveNodeConfirm,
    openRemoveChoiceConfirm,
  };
}
