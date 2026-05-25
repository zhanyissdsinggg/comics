"use client";

import { ArrowRight, Copy, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminBadge,
  AdminFormField,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "../common/AdminWorkspacePrimitives";

export default function InteractiveStoryChoiceCard({
  choice,
  form,
  targetNode,
  nodes,
  selectedNode,
  busy,
  choiceDirty,
  setChoiceForms,
  saveChoice,
  setSelectedNodeId,
  generateNextNode,
  removeChoice,
  createTargetNodeForChoice,
  copyToClipboard,
  setFeedback,
}) {
  return (
    <div className="rounded-[22px] border border-[color:var(--gush-border)] p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {form.label || "Untitled choice"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {form.choiceKey || "Choice key not set"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminBadge>
            {targetNode ? `Targets ${targetNode.title}` : "No target node yet"}
          </AdminBadge>
          {choiceDirty ? <AdminBadge tone="warning">Unsaved</AdminBadge> : null}
          {form.choiceKey ? (
            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(form.choiceKey);
                setFeedback({
                  type: ok ? "success" : "error",
                  message: ok
                    ? "Choice key copied"
                    : "Copy failed. Please copy the choice key manually.",
                });
              }}
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/70 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950"
            >
              <Copy className="size-3" />
              Copy Key
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormField label="Choice Key">
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
          <AdminFormField label="Choice Label">
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
          <AdminFormField
            label="Target Node"
            helperText="Leave empty to keep the branch unlinked until you create or attach a target."
          >
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
              <option value="">No target node yet</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.nodeKey} / {node.title}
                </option>
              ))}
            </select>
            {!form.targetNodeId ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void createTargetNodeForChoice(choice.id, selectedNode)
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/70 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-white hover:text-slate-950"
                >
                  <ArrowRight className="size-3" />
                  Create Target Node
                </button>
              </div>
            ) : null}
          </AdminFormField>
          <AdminFormField label="Sort Order">
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

        <AdminFormField
          label="Choice Description"
          helperText="Internal note for editors, exports, or review context."
        >
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
            placeholder="What this branch is supposed to do emotionally or structurally."
          />
        </AdminFormField>

        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormField
            label="Required Flags"
            helperText="Comma or newline separated."
          >
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
          <AdminFormField
            label="Blocked Flags"
            helperText="Comma or newline separated."
          >
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

        <AdminFormField
          label="State Effects JSON"
          helperText='Example: {"clues": 1, "risk": -1}'
        >
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

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => saveChoice(choice.id)}>
            <Save className="size-4" />
            Save Choice
          </Button>
          {form.targetNodeId ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedNodeId(form.targetNodeId)}
            >
              <ArrowRight className="size-4" />
              Open Target Node
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateNextNode(selectedNode.id, choice.id)}
            disabled={busy}
          >
            <Sparkles className="size-4" />
            Generate Next Node
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => removeChoice(choice.id)}
          >
            <Trash2 className="size-4" />
            Delete Choice
          </Button>
        </div>
      </div>
    </div>
  );
}
