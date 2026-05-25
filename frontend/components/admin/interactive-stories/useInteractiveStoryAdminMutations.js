"use client";

import { useCallback } from "react";
import {
  adminDelete,
  adminPatch,
  adminPost,
} from "../../../lib/adminApiClient";
import {
  emptyChoice,
  emptyNode,
  mapChoiceToForm,
  mapNodeToForm,
  normalizeInteger,
  parseJsonText,
  parseStringList,
} from "./formState";

function msg(resp, fallback) {
  return String(
    resp?.error || resp?.message || resp?.data?.message || fallback || "",
  ).trim();
}

export default function useInteractiveStoryAdminMutations({
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
}) {
  const buildStoryPayload = useCallback(() => {
    return {
      slug: story.slug,
      title: story.title,
      seriesId: story.seriesId || null,
      description: story.description || null,
      coverImage: story.coverImage || null,
      genre: story.genre || null,
      targetAudience: story.targetAudience || null,
      contentMode: story.contentMode || "normal",
      status: story.status || (story.isPublished ? "published" : "draft"),
      baseContext: story.baseContext || null,
      initialState: parseJsonText(story.initialStateText, "Story initial state"),
      isPublished: story.isPublished,
      aiEnabled: story.aiEnabled,
    };
  }, [story]);

  const buildNodePayload = useCallback((form) => {
    return {
      nodeKey: form.nodeKey,
      title: form.title,
      body: form.body || null,
      imageUrl: form.imageUrl || null,
      endingType: form.endingType || null,
      orderIndex: normalizeInteger(
        form.orderIndex,
        normalizeInteger(form.sortOrder),
      ),
      sortOrder: normalizeInteger(form.sortOrder),
      baseContext: form.baseContext || null,
      basePrompt: form.basePrompt || null,
      fallbackText: form.fallbackText || null,
      requiredFlags: parseStringList(form.requiredFlagsText),
      blockedFlags: parseStringList(form.blockedFlagsText),
      stateEffects: parseJsonText(form.stateEffectsText, "Node state effects"),
      isEnding: Boolean(form.isEnding),
      aiEnabled: Boolean(form.aiEnabled),
      generatedByAI: Boolean(form.generatedByAI),
      reviewStatus: form.reviewStatus || "approved",
      editorNotes: form.editorNotes || null,
    };
  }, []);

  const buildChoicePayload = useCallback((form) => {
    return {
      choiceKey: form.choiceKey,
      label: form.label,
      description: form.description || null,
      targetNodeId: form.targetNodeId || null,
      requiresPremium: Boolean(form.requiresPremium),
      requiresTokens: normalizeInteger(form.requiresTokens),
      orderIndex: normalizeInteger(
        form.orderIndex,
        normalizeInteger(form.sortOrder),
      ),
      sortOrder: normalizeInteger(form.sortOrder),
      requiredFlags: parseStringList(form.requiredFlagsText),
      blockedFlags: parseStringList(form.blockedFlagsText),
      stateEffects: parseJsonText(
        form.stateEffectsText,
        "Choice state effects",
      ),
    };
  }, []);

  const buildUniqueNodeKey = useCallback(
    (baseKey) => {
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
    },
    [nodes],
  );

  const duplicateNode = useCallback(
    async (nodeId) => {
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
        title: payload.title ? `${payload.title} (Copy)` : "Node Copy",
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
        setFeedback({ type: "error", message: msg(resp, "Failed to duplicate node") });
        return;
      }

      setFeedback({ type: "success", message: "Node duplicated" });
      await loadDetail(selectedStoryId);
      setSelectedNodeId(resp.data?.node?.id || "");
    },
    [
      buildNodePayload,
      buildUniqueNodeKey,
      loadDetail,
      nodeForms,
      nodes,
      selectedStoryId,
      setBusy,
      setFeedback,
      setSelectedNodeId,
    ],
  );

  const resequenceNodesNow = useCallback(async () => {
    if (!selectedStoryId) return;
    if (dirtyNodeCount > 0) {
      setFeedback({
        type: "error",
        message: "Save all dirty nodes and choices before resequencing.",
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
      setFeedback({ type: "error", message: "No nodes to resequence." });
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
            msg(resp, `Failed to resequence node ${node.nodeKey || node.id}`),
          );
        }
      }
      setFeedback({ type: "success", message: "Node ordering updated" });
      await loadDetail(selectedStoryId);
    } catch (error) {
      setFeedback({
        type: "error",
        message: `Failed to resequence nodes: ${msg(error, "Unknown error")}`,
      });
    } finally {
      setBusy(false);
    }
  }, [
    buildNodePayload,
    dirtyNodeCount,
    loadDetail,
    nodes,
    selectedStoryId,
    setBusy,
    setFeedback,
  ]);

  const resequenceChoicesNow = useCallback(
    async (nodeId) => {
      if (!selectedStoryId || !nodeId) return;
      if (dirtyNodeCount > 0) {
        setFeedback({
          type: "error",
          message: "Save all dirty nodes and choices before resequencing.",
        });
        return;
      }

      const node = nodes.find((item) => item.id === nodeId);
      const choices = Array.isArray(node?.choices) ? [...node.choices] : [];
      if (!node || choices.length === 0) {
        setFeedback({ type: "error", message: "No choices to resequence." });
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
              msg(
                resp,
                `Failed to resequence choice ${choice.choiceKey || choice.id}`,
              ),
            );
          }
        }
        setFeedback({ type: "success", message: "Choice ordering updated" });
        await loadDetail(selectedStoryId);
      } catch (error) {
        setFeedback({
          type: "error",
          message: `Failed to resequence choices: ${msg(error, "Unknown error")}`,
        });
      } finally {
        setBusy(false);
      }
    },
    [
      buildChoicePayload,
      dirtyNodeCount,
      loadDetail,
      nodes,
      selectedStoryId,
      setBusy,
      setFeedback,
    ],
  );

  const saveStory = useCallback(async () => {
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
      setFeedback({ type: "error", message: msg(resp, "Failed to save story") });
      return;
    }
    setFeedback({ type: "success", message: "Story saved" });
    await loadStories();
    await loadDetail(selectedStoryId);
  }, [
    buildStoryPayload,
    loadDetail,
    loadStories,
    selectedStoryId,
    setBusy,
    setFeedback,
  ]);

  const createStory = useCallback(async () => {
    if (!story.slug.trim() || !story.title.trim()) {
      setFeedback({ type: "error", message: "Story slug and title are required." });
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
      setFeedback({ type: "error", message: msg(resp, "Failed to create story") });
      return;
    }
    setFeedback({ type: "success", message: "Interactive story created" });
    await loadStories();
    setSelectedStoryId(resp.data?.story?.id || "");
    setActiveTab("nodes");
  }, [
    buildStoryPayload,
    loadStories,
    setActiveTab,
    setBusy,
    setFeedback,
    setSelectedStoryId,
    story.slug,
    story.title,
  ]);

  const publishStory = useCallback(
    async (publish) => {
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
          message: msg(
            resp,
            publish ? "Failed to publish story" : "Failed to unpublish story",
          ),
        });
        return;
      }
      setFeedback({
        type: "success",
        message: publish ? "Story published to public site" : "Story removed from public site",
      });
      await loadStories();
      await loadDetail(selectedStoryId);
    },
    [loadDetail, loadStories, selectedStoryId, setBusy, setFeedback],
  );

  const removeStory = useCallback(async () => {
    if (!selectedStoryId) return;
    setBusy(true);
    const resp = await adminDelete(
      `/api/admin/interactive-stories/${selectedStoryId}`,
    );
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "Failed to remove story") });
      return;
    }
    setFeedback({ type: "success", message: "Story removed" });
    resetToNewStory();
    await loadStories();
  }, [
    loadStories,
    resetToNewStory,
    selectedStoryId,
    setBusy,
    setFeedback,
  ]);

  const createNode = useCallback(async () => {
    if (!selectedStoryId) return;

    let payload;
    try {
      payload = buildNodePayload(nodeDraft);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
      return;
    }

    setBusy(true);
    const resp = await adminPost(
      `/api/admin/interactive-stories/${selectedStoryId}/nodes`,
      {
        node: payload,
        setAsInitial: nodes.length === 0,
      },
    );
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: msg(resp, "Failed to create node") });
      return;
    }
    setFeedback({ type: "success", message: "Node created" });
    setNodeDraft(emptyNode());
    await loadDetail(selectedStoryId);
    setSelectedNodeId(resp.data?.node?.id || "");
  }, [
    buildNodePayload,
    loadDetail,
    nodeDraft,
    nodes.length,
    selectedStoryId,
    setBusy,
    setFeedback,
    setNodeDraft,
    setSelectedNodeId,
  ]);

  const saveNode = useCallback(
    async (nodeId) => {
      const form = nodeForms[nodeId];
      let payload;
      try {
        payload = buildNodePayload(form);
      } catch (error) {
        setFeedback({ type: "error", message: error.message });
        return;
      }

      setBusy(true);
      const resp = await adminPatch(
        `/api/admin/interactive-stories/nodes/${nodeId}`,
        { node: payload },
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({ type: "error", message: msg(resp, "Failed to save node") });
        return;
      }
      setFeedback({ type: "success", message: "Node saved" });
      await loadDetail(selectedStoryId);
    },
    [buildNodePayload, loadDetail, nodeForms, selectedStoryId, setBusy, setFeedback],
  );

  const setStartNode = useCallback(
    async (nodeId) => {
      const form = nodeForms[nodeId] || emptyNode();
      let payload;
      try {
        payload = buildNodePayload(form);
      } catch (error) {
        setFeedback({ type: "error", message: error.message });
        return;
      }

      setBusy(true);
      const resp = await adminPatch(
        `/api/admin/interactive-stories/nodes/${nodeId}`,
        {
          node: payload,
          setAsInitial: true,
        },
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({
          type: "error",
          message: msg(resp, "Failed to set initial node"),
        });
        return;
      }
      setFeedback({ type: "success", message: "Initial node updated" });
      await loadDetail(selectedStoryId);
    },
    [buildNodePayload, loadDetail, nodeForms, selectedStoryId, setBusy, setFeedback],
  );

  const removeNode = useCallback(
    async (nodeId) => {
      setBusy(true);
      const resp = await adminDelete(
        `/api/admin/interactive-stories/nodes/${nodeId}`,
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({ type: "error", message: msg(resp, "Failed to remove node") });
        return;
      }
      setFeedback({ type: "success", message: "Node removed" });
      await loadDetail(selectedStoryId);
    },
    [loadDetail, selectedStoryId, setBusy, setFeedback],
  );

  const saveChoice = useCallback(
    async (choiceId) => {
      const form = choiceForms[choiceId];
      let payload;
      try {
        payload = buildChoicePayload(form);
      } catch (error) {
        setFeedback({ type: "error", message: error.message });
        return;
      }

      setBusy(true);
      const resp = await adminPatch(
        `/api/admin/interactive-stories/choices/${choiceId}`,
        { choice: payload },
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({ type: "error", message: msg(resp, "Failed to save choice") });
        return;
      }
      setFeedback({ type: "success", message: "Choice saved" });
      await loadDetail(selectedStoryId);
    },
    [buildChoicePayload, choiceForms, loadDetail, selectedStoryId, setBusy, setFeedback],
  );

  const attachChoiceToNode = useCallback(
    async (choiceId, targetNodeId) => {
      if (!choiceId || !targetNodeId) return;

      const form = choiceForms[choiceId] || emptyChoice();
      let payload;
      try {
        payload = buildChoicePayload({
          ...form,
          targetNodeId,
        });
      } catch (error) {
        setFeedback({ type: "error", message: error.message });
        return;
      }

      setBusy(true);
      const resp = await adminPatch(
        `/api/admin/interactive-stories/choices/${choiceId}`,
        { choice: payload },
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({
          type: "error",
          message: msg(resp, "Failed to attach generated node to choice"),
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "Choice target node updated",
      });
      await loadDetail(selectedStoryId);
    },
    [buildChoicePayload, choiceForms, loadDetail, selectedStoryId, setBusy, setFeedback],
  );

  const createTargetNodeForChoice = useCallback(
    async (choiceId, sourceNode) => {
      if (!selectedStoryId || !choiceId) return;

      if (dirtyNodeCount > 0) {
        setFeedback({
          type: "warning",
          message: "Save current node and choice edits before creating a target node.",
        });
        return;
      }

      if (choiceDirtyById[choiceId]) {
        setFeedback({
          type: "warning",
          message: "Save this choice before creating its target node.",
        });
        return;
      }

      const nextForm = {
        ...emptyNode(),
        nodeKey: buildUniqueNodeKey("node"),
        title: "New Node",
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
          message: msg(createResp, "Failed to create target node"),
        });
        return;
      }

      const createdNodeId = createResp.data?.node?.id || "";
      if (!createdNodeId) {
        setBusy(false);
        setFeedback({
          type: "error",
          message: "Failed to create target node: missing node id",
        });
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
          message: msg(patchResp, "Target node created, but failed to bind choice"),
        });
        await loadDetail(selectedStoryId);
        return;
      }

      setFeedback({ type: "success", message: "Created and attached target node" });
      await loadDetail(selectedStoryId);
      setActiveTab("nodes");
      setSelectedNodeId(createdNodeId);
    },
    [
      buildChoicePayload,
      buildNodePayload,
      buildUniqueNodeKey,
      choiceDirtyById,
      choiceForms,
      dirtyNodeCount,
      loadDetail,
      selectedStoryId,
      setActiveTab,
      setBusy,
      setFeedback,
      setSelectedNodeId,
    ],
  );

  const addChoice = useCallback(
    async (nodeId) => {
      const form = newChoiceByNode[nodeId] || emptyChoice();
      let payload;
      try {
        payload = buildChoicePayload(form);
      } catch (error) {
        setFeedback({ type: "error", message: error.message });
        return;
      }

      setBusy(true);
      const resp = await adminPost(
        `/api/admin/interactive-stories/nodes/${nodeId}/choices`,
        { choice: payload },
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({ type: "error", message: msg(resp, "Failed to add choice") });
        return;
      }
      setFeedback({ type: "success", message: "Choice added" });
      setNewChoiceByNode((current) => ({ ...current, [nodeId]: emptyChoice() }));
      await loadDetail(selectedStoryId);
    },
    [
      buildChoicePayload,
      loadDetail,
      newChoiceByNode,
      selectedStoryId,
      setBusy,
      setFeedback,
      setNewChoiceByNode,
    ],
  );

  const generateNextNode = useCallback(
    async (fromNodeId, choiceId) => {
      if (!selectedStoryId || !fromNodeId || !choiceId) return;

      setBusy(true);
      const resp = await adminPost(
        `/api/admin/interactive-stories/${selectedStoryId}/generate-node`,
        {
          input: {
            fromNodeId,
            choiceId,
            desiredLength: 220,
            editorNotes: "AI draft generated from admin assist.",
          },
        },
      );
      setBusy(false);

      if (!resp.ok) {
        setFeedback({
          type: "error",
          message: msg(resp, "Failed to generate next draft node"),
        });
        await loadDetail(selectedStoryId);
        return;
      }

      const generatedNodeId = resp.data?.generatedNode?.id || "";
      setFeedback({
        type: "success",
        message: "AI draft node generated and kept in review flow",
      });
      await loadDetail(selectedStoryId);
      if (generatedNodeId) {
        setSelectedNodeId(generatedNodeId);
      }
    },
    [loadDetail, selectedStoryId, setBusy, setFeedback, setSelectedNodeId],
  );

  const generateStoryboardForNode = useCallback(
    async (nodeId) => {
      if (!selectedStoryId || !nodeId) return;

      setBusy(true);
      const resp = await adminPost(
        `/api/admin/interactive-stories/${selectedStoryId}/nodes/${nodeId}/storyboard`,
        {
          input: {
            desiredPanelCount: 3,
          },
        },
      );
      setBusy(false);

      if (!resp.ok) {
        setFeedback({
          type: "error",
          message: msg(resp, "Failed to generate storyboard"),
        });
        return;
      }

      const panels = Array.isArray(resp.data?.storyboard?.panels)
        ? resp.data.storyboard.panels
        : [];
      const nextNodeForm = nodeForms[nodeId] || emptyNode();
      setNodeForms((current) => ({
        ...current,
        [nodeId]: {
          ...nextNodeForm,
          editorNotes: nextNodeForm.editorNotes || "Storyboard draft generated.",
        },
      }));
      setFeedback({
        type: "success",
        message: `Storyboard generated with ${panels.length} panel drafts`,
      });
      await loadDetail(selectedStoryId);
      setSelectedNodeId(nodeId);
    },
    [
      loadDetail,
      nodeForms,
      selectedStoryId,
      setBusy,
      setFeedback,
      setNodeForms,
      setSelectedNodeId,
    ],
  );

  const generatePanelsForNode = useCallback(
    async (nodeId, panelNumbers = []) => {
      if (!selectedStoryId || !nodeId) return;

      setBusy(true);
      const resp = await adminPost(
        `/api/admin/interactive-stories/${selectedStoryId}/nodes/${nodeId}/generate-panels`,
        {
          input: {
            regenerate: Array.isArray(panelNumbers) && panelNumbers.length > 0,
            panelNumbers,
          },
        },
      );
      setBusy(false);

      if (!resp.ok) {
        setFeedback({
          type: "error",
          message: msg(resp, "Failed to generate panel images"),
        });
        await loadDetail(selectedStoryId);
        return;
      }

      setFeedback({
        type: "success",
        message: "Panel drafts generated and sent to review",
      });
      await loadDetail(selectedStoryId);
      setSelectedNodeId(nodeId);
    },
    [loadDetail, selectedStoryId, setBusy, setFeedback, setSelectedNodeId],
  );

  const approvePanel = useCallback(
    async (panelId) => {
      if (!panelId) return;
      const reviewForm = panelReviewForms[panelId] || {};
      setBusy(true);
      const resp = await adminPost(
        `/api/admin/interactive-panels/${panelId}/approve`,
        {
          panel: {
            finalImageUrl: String(reviewForm.finalImageUrl || "").trim() || null,
          },
        },
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({ type: "error", message: msg(resp, "Failed to approve panel") });
        return;
      }
      setFeedback({ type: "success", message: "Panel approved" });
      await loadDetail(selectedStoryId);
    },
    [loadDetail, panelReviewForms, selectedStoryId, setBusy, setFeedback],
  );

  const rejectPanel = useCallback(
    async (panelId) => {
      if (!panelId) return;
      setBusy(true);
      const resp = await adminPost(
        `/api/admin/interactive-panels/${panelId}/reject`,
        {},
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({ type: "error", message: msg(resp, "Failed to reject panel") });
        return;
      }
      setFeedback({ type: "success", message: "Panel rejected" });
      await loadDetail(selectedStoryId);
    },
    [loadDetail, selectedStoryId, setBusy, setFeedback],
  );

  const regeneratePanel = useCallback(
    async (panelId) => {
      if (!panelId) return;
      setBusy(true);
      const resp = await adminPost(
        `/api/admin/interactive-panels/${panelId}/regenerate`,
        {},
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({
          type: "error",
          message: msg(resp, "Failed to regenerate panel"),
        });
        return;
      }
      setFeedback({ type: "success", message: "Panel regenerated for review" });
      await loadDetail(selectedStoryId);
    },
    [loadDetail, selectedStoryId, setBusy, setFeedback],
  );

  const removeChoice = useCallback(
    async (choiceId) => {
      setBusy(true);
      const resp = await adminDelete(
        `/api/admin/interactive-stories/choices/${choiceId}`,
      );
      setBusy(false);
      if (!resp.ok) {
        setFeedback({ type: "error", message: msg(resp, "Failed to remove choice") });
        return;
      }
      setFeedback({ type: "success", message: "Choice removed" });
      await loadDetail(selectedStoryId);
    },
    [loadDetail, selectedStoryId, setBusy, setFeedback],
  );

  return {
    buildStoryPayload,
    buildNodePayload,
    buildChoicePayload,
    buildUniqueNodeKey,
    duplicateNode,
    resequenceNodesNow,
    resequenceChoicesNow,
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
  };
}
