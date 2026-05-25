"use client";

import { ArrowRight, Copy, GitBranch, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminBadge,
  AdminFormField,
  adminCheckboxClassName,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "../common/AdminWorkspacePrimitives";

function formatReviewStatus(status) {
  const value = String(status || "").trim();
  if (value === "pending_review") return "pending_review";
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "draft";
}

export default function InteractiveStoryNodeEditorSection({
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
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Node Editor</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Update the node copy, AI constraints, state effects, and review
            status for the currently selected beat.
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
                ? "Start Node"
                : selectedNode.isEnding
                  ? "Ending Node"
                  : "Story Node"}
            </AdminBadge>
          ) : null}
          {selectedNode && selectedNodeDirty ? (
            <AdminBadge tone="warning">Unsaved node</AdminBadge>
          ) : null}
          {selectedChoiceDirtyCount > 0 ? (
            <AdminBadge tone="warning">
              {selectedChoiceDirtyCount} unsaved choice
              {selectedChoiceDirtyCount > 1 ? "s" : ""}
            </AdminBadge>
          ) : null}
        </div>
      </div>

      {!selectedNode ? (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Select a node from the map to start editing.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {selectedNode.title || "Untitled node"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedNode.nodeKey || "Node key not set"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminBadge>{selectedNode.choices?.length || 0} choices</AdminBadge>
                <AdminBadge>{selectedNodeTargets.length} targets</AdminBadge>
                <AdminBadge tone={selectedNode.aiEnabled ? "accent" : "default"}>
                  {selectedNode.aiEnabled ? "AI enabled" : "AI disabled"}
                </AdminBadge>
                {selectedNode.generatedByAI ? (
                  <AdminBadge tone="accent">AI draft</AdminBadge>
                ) : null}
                {selectedNode.reviewStatus ? (
                  <AdminBadge
                    tone={
                      selectedNode.reviewStatus === "approved"
                        ? "success"
                        : selectedNode.reviewStatus === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {formatReviewStatus(selectedNode.reviewStatus)}
                  </AdminBadge>
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
                    aria-label={`跳到 ${node.title}`}
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
            <AdminFormField label="Node Key">
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
            <AdminFormField label="Title">
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
            <AdminFormField label="Sort Order">
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
            <AdminFormField
              label="Fallback Text"
              helperText="Returned to the reader if AI generation is unavailable."
            >
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

          <AdminFormField label="Reader-Facing Body">
            <textarea
              rows={6}
              value={selectedNodeForm.body}
              onChange={(event) =>
                setNodeForms((current) => ({
                  ...current,
                  [selectedNode.id]: {
                    ...selectedNodeForm,
                    body: event.target.value,
                  },
                }))
              }
              className={adminTextareaClassName}
              placeholder="Main story text shown to the reader for this node."
            />
          </AdminFormField>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Node Context">
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
                placeholder="What has already happened, what the reader knows, and what this beat must preserve."
              />
            </AdminFormField>
            <AdminFormField label="AI Prompt">
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
                placeholder="Tone, pacing, camera feel, mandatory plot points, and safety constraints for this node."
              />
            </AdminFormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Image URL">
              <input
                value={selectedNodeForm.imageUrl}
                onChange={(event) =>
                  setNodeForms((current) => ({
                    ...current,
                    [selectedNode.id]: {
                      ...selectedNodeForm,
                      imageUrl: event.target.value,
                    },
                  }))
                }
                className={adminInputClassName}
                placeholder="/images/interactive/node-01.jpg"
              />
            </AdminFormField>
            <AdminFormField label="Ending Type">
              <input
                value={selectedNodeForm.endingType}
                onChange={(event) =>
                  setNodeForms((current) => ({
                    ...current,
                    [selectedNode.id]: {
                      ...selectedNodeForm,
                      endingType: event.target.value,
                    },
                  }))
                }
                className={adminInputClassName}
                placeholder="good-ending"
              />
            </AdminFormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField
              label="Review Status"
              helperText="Draft and pending nodes must stay out of public reading routes."
            >
              <select
                value={selectedNodeForm.reviewStatus || "approved"}
                onChange={(event) =>
                  setNodeForms((current) => ({
                    ...current,
                    [selectedNode.id]: {
                      ...selectedNodeForm,
                      reviewStatus: event.target.value,
                    },
                  }))
                }
                className={adminSelectClassName}
              >
                <option value="draft">draft</option>
                <option value="pending_review">pending_review</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
              </select>
            </AdminFormField>
            <AdminFormField label="Editor Notes">
              <input
                value={selectedNodeForm.editorNotes || ""}
                onChange={(event) =>
                  setNodeForms((current) => ({
                    ...current,
                    [selectedNode.id]: {
                      ...selectedNodeForm,
                      editorNotes: event.target.value,
                    },
                  }))
                }
                className={adminInputClassName}
                placeholder="Internal notes for editorial review."
              />
            </AdminFormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField
              label="Required Flags"
              helperText="Comma or newline separated. All listed flags must be present."
            >
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
                placeholder="met_editor, found_key"
              />
            </AdminFormField>
            <AdminFormField
              label="Blocked Flags"
              helperText="Comma or newline separated. Any matched flag blocks this node."
            >
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
                placeholder="bad_ending"
              />
            </AdminFormField>
          </div>

          <AdminFormField
            label="State Effects JSON"
            helperText='Example: {"trust": 1, "risk": -1, "flagsAdd": ["met_editor"]}'
          >
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
                checked={Boolean(selectedNodeForm.isEnding)}
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
              Mark as ending node
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(selectedNodeForm.aiEnabled)}
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
              Allow AI assist on this node
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => saveNode(selectedNode.id)}>
              <Save className="size-4" />
              保存节点
            </Button>
            {selectedNode.generatedByAI && selectedNodeSourceChoiceId ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  attachChoiceToNode(selectedNodeSourceChoiceId, selectedNode.id)
                }
                disabled={!selectedNodeApproved}
              >
                <GitBranch className="size-4" />
                绑定分支
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStartNode(selectedNode.id)}
            >
              Set As Start Node
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => duplicateNode(selectedNode.id)}
            >
              <Copy className="size-4" />
              Duplicate Node
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => removeNode(selectedNode.id)}
            >
              <Trash2 className="size-4" />
              Delete Node
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
