"use client";

import { useCallback, useEffect } from "react";
import { adminGet, adminPost } from "../../../lib/adminApiClient";
import {
  emptyChoice,
  emptyNode,
  emptyStory,
  mapChoiceToForm,
  mapNodeToForm,
  mapPanelReviewToForm,
  mapStoryToForm,
} from "./formState";

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

export default function useInteractiveStoryAdminBootstrap({
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
}) {
  const resetToNewStory = useCallback(() => {
    setSelectedStoryId("");
    setSelectedNodeId("");
    setDetail(null);
    setStory(emptyStory());
    setNodeDraft(emptyNode());
    setNodeForms({});
    setChoiceForms({});
    setPanelReviewForms({});
    setNewChoiceByNode({});
    setValidation(null);
    setActiveTab("story");
  }, [
    setActiveTab,
    setChoiceForms,
    setDetail,
    setNewChoiceByNode,
    setNodeDraft,
    setNodeForms,
    setPanelReviewForms,
    setSelectedNodeId,
    setSelectedStoryId,
    setStory,
    setValidation,
  ]);

  const loadValidation = useCallback(
    async (id) => {
      if (!id) {
        setValidation(null);
        return;
      }
      const resp = await adminGet(
        `/api/admin/interactive-stories/${id}/validation`,
        { bust: true },
      );
      setValidation(resp.ok ? resp.data?.validation || null : null);
    },
    [setValidation],
  );

  const loadStories = useCallback(async () => {
    setLoading(true);
    const resp = await adminGet(
      "/api/admin/interactive-stories?page=1&pageSize=100",
      { bust: true },
    );
    if (!resp.ok) {
      setStories([]);
      setFeedback({
        type: "error",
        message: msg(resp, "Failed to load interactive stories"),
      });
      setLoading(false);
      return;
    }
    const list = Array.isArray(resp.data?.stories) ? resp.data.stories : [];
    setStories(list);
    setSelectedStoryId((current) => {
      if (startInCreateMode) {
        return "";
      }
      if (list.some((item) => item.id === current)) {
        return current;
      }
      if (
        normalizedInitialStoryId &&
        list.some((item) => item.id === normalizedInitialStoryId)
      ) {
        return normalizedInitialStoryId;
      }
      return list[0]?.id || "";
    });
    setLoading(false);
  }, [
    normalizedInitialStoryId,
    setFeedback,
    setLoading,
    setSelectedStoryId,
    setStories,
    startInCreateMode,
  ]);

  const loadDetail = useCallback(
    async (id) => {
      if (!id) {
        setDetail(null);
        setStory(emptyStory());
        setSelectedNodeId("");
        setValidation(null);
        setNodeForms({});
        setChoiceForms({});
        setPanelReviewForms({});
        setNewChoiceByNode({});
        return;
      }

      const resp = await adminGet(`/api/admin/interactive-stories/${id}`, {
        bust: true,
      });
      if (!resp.ok) {
        setFeedback({
          type: "error",
          message: msg(resp, "Failed to load story details"),
        });
        return;
      }

      const next = resp.data?.story || null;
      setDetail(next);
      setStory(mapStoryToForm(next));

      const nextNodeForms = {};
      const nextChoiceForms = {};
      const nextPanelReviewForms = {};
      const nextChoiceDrafts = {};

      for (const node of next?.nodes || []) {
        nextNodeForms[node.id] = mapNodeToForm(node);
        nextChoiceDrafts[node.id] = emptyChoice();
        for (const choice of node.choices || []) {
          nextChoiceForms[choice.id] = mapChoiceToForm(choice);
        }
        for (const panel of node.panels || []) {
          nextPanelReviewForms[panel.id] = mapPanelReviewToForm(panel);
        }
      }

      setNodeForms(nextNodeForms);
      setChoiceForms(nextChoiceForms);
      setPanelReviewForms(nextPanelReviewForms);
      setNewChoiceByNode(nextChoiceDrafts);
      setSelectedNodeId((current) =>
        next?.nodes?.some((item) => item.id === current)
          ? current
          : next?.nodes?.[0]?.id || "",
      );
      await loadValidation(id);
    },
    [
      loadValidation,
      setChoiceForms,
      setDetail,
      setFeedback,
      setNewChoiceByNode,
      setNodeForms,
      setPanelReviewForms,
      setSelectedNodeId,
      setStory,
      setValidation,
    ],
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
    if (startInCreateMode) {
      resetToNewStory();
      return;
    }
    if (normalizedInitialStoryId) {
      setSelectedStoryId(normalizedInitialStoryId);
    }
    setActiveTab(normalizedInitialActiveTab);
  }, [
    normalizedInitialActiveTab,
    normalizedInitialStoryId,
    resetToNewStory,
    setActiveTab,
    setSelectedStoryId,
    startInCreateMode,
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadDetail(selectedStoryId);
    }
  }, [isAuthenticated, loadDetail, selectedStoryId]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (!selectedStoryId) {
      if (!startInCreateMode) {
        router.replace("/admin/interactive-stories/new");
      }
      return;
    }

    const nextPath =
      activeTab === "nodes"
        ? `/admin/interactive-stories/${selectedStoryId}/nodes`
        : `/admin/interactive-stories/${selectedStoryId}`;
    router.replace(nextPath);
  }, [activeTab, isAuthenticated, router, selectedStoryId, startInCreateMode]);

  const exportStory = useCallback(async () => {
    if (!selectedStoryId) return;
    const resp = await adminGet(
      `/api/admin/interactive-stories/${selectedStoryId}/export`,
      { bust: true },
    );
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "Export failed") });
      return;
    }
    const payload = resp.data?.payload || {};
    exportJson(
      `${payload?.story?.slug || selectedStoryId}-interactive-story.json`,
      payload,
    );
    setFeedback({ type: "success", message: "Export complete" });
  }, [selectedStoryId, setFeedback]);

  const copyStoryJson = useCallback(async () => {
    if (!selectedStoryId) return;
    const resp = await adminGet(
      `/api/admin/interactive-stories/${selectedStoryId}/export`,
      { bust: true },
    );
    if (!resp.ok) {
      setFeedback({
        type: "error",
        message: msg(resp, "Failed to load export JSON"),
      });
      return;
    }
    const payload = resp.data?.payload || {};
    const ok = await copyToClipboard(JSON.stringify(payload, null, 2));
    setFeedback({
      type: ok ? "success" : "error",
      message: ok
        ? "Export JSON copied"
        : "Copy failed. Use the export download instead.",
    });
  }, [copyToClipboard, selectedStoryId, setFeedback]);

  const fillImportTemplate = useCallback(() => {
    const template = {
      story: {
        slug: "midnight-archive",
        title: "Midnight Archive",
        description: "Sample interactive story skeleton for import testing.",
        seriesId: "",
        baseContext:
          "Use this area for world rules, recurring cast notes, and narration constraints.",
        initialNodeId: "intro-01",
        initialState: { trust: 0, risk: 0, clues: 0 },
        aiEnabled: true,
      },
      nodes: [
        {
          nodeKey: "intro-01",
          title: "Cold Open",
          basePrompt:
            "Write a 120-180 word opening beat that ends on a hook.",
          fallbackText: "Fallback copy for the opening scene.",
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: 0,
          isEnding: false,
          aiEnabled: true,
          choices: [
            {
              choiceKey: "look_closer",
              label: "Look closer",
              description: "Slow down and inspect the scene carefully.",
              targetNodeKey: "scene-02",
              requiredFlags: [],
              blockedFlags: [],
              stateEffects: { clues: 1 },
              sortOrder: 0,
            },
            {
              choiceKey: "walk_away",
              label: "Back off",
              description: "Stay safe and create some distance first.",
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
          title: "Second Beat",
          basePrompt:
            "Continue the consequence of the previous choice and open a fresh branch.",
          fallbackText: "Fallback copy for the second scene.",
          requiredFlags: [],
          blockedFlags: [],
          stateEffects: {},
          sortOrder: 1,
          isEnding: false,
          aiEnabled: true,
          choices: [
            {
              choiceKey: "ask_editor",
              label: "Talk to the editor",
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
          title: "Ending",
          basePrompt: "Close the branch with a clear ending beat.",
          fallbackText: "The story ends here.",
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
      message: "Import template generated. Edit it and import when ready.",
    });
  }, [setActiveTab, setFeedback, setImportMode, setImportText]);

  const importStory = useCallback(async () => {
    if (!importText.trim()) {
      setFeedback({ type: "error", message: "Paste import JSON first" });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(importText);
    } catch {
      setFeedback({ type: "error", message: "Invalid JSON format" });
      return;
    }

    setBusy(true);
    const resp = await adminPost("/api/admin/interactive-stories/import", {
      mode: importMode,
      payload,
    });
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "Import failed") });
      return;
    }
    setFeedback({
      type: "success",
      message: "Import completed and story structure refreshed",
    });
    setValidation(resp.data?.validation || null);
    await loadStories();
    setSelectedStoryId(resp.data?.story?.id || "");
  }, [
    importMode,
    importText,
    loadStories,
    setBusy,
    setFeedback,
    setSelectedStoryId,
    setValidation,
  ]);

  return {
    loadStories,
    loadDetail,
    loadValidation,
    resetToNewStory,
    exportStory,
    copyStoryJson,
    fillImportTemplate,
    importStory,
  };
}
