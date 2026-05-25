"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminBadge,
  AdminFormField,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "../common/AdminWorkspacePrimitives";
import { emptyChoice } from "./formState";

export default function InteractiveStoryNewChoiceSection({
  selectedNode,
  nodes,
  newChoiceByNode,
  setNewChoiceByNode,
  addChoice,
}) {
  if (!selectedNode) {
    return null;
  }

  const draft = newChoiceByNode[selectedNode.id] || emptyChoice();

  return (
    <div className="rounded-[22px] border border-dashed border-[color:var(--gush-border)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">New Choice</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Add another branch entry point for this node, then wire it to an
            existing or newly created target node.
          </p>
        </div>
        <AdminBadge tone="accent">Branch Draft</AdminBadge>
      </div>
      <div className="mt-4 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormField label="Choice Key">
            <input
              value={draft.choiceKey}
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
          <AdminFormField label="Choice Label">
            <input
              value={draft.label}
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
              placeholder="Talk to the editor"
            />
          </AdminFormField>
          <AdminFormField label="Target Node">
            <select
              value={draft.targetNodeId || ""}
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
              <option value="">No target node yet</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.nodeKey} / {node.title}
                </option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField label="Sort Order">
            <input
              type="number"
              value={draft.sortOrder}
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
        <AdminFormField label="Choice Description">
          <textarea
            rows={3}
            value={draft.description}
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
            placeholder="Explain what this branch should feel like or reveal."
          />
        </AdminFormField>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormField label="Required Flags">
            <textarea
              rows={3}
              value={draft.requiredFlagsText}
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
              placeholder="met_editor"
            />
          </AdminFormField>
          <AdminFormField label="Blocked Flags">
            <textarea
              rows={3}
              value={draft.blockedFlagsText}
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
              placeholder="bad_ending"
            />
          </AdminFormField>
        </div>
        <AdminFormField
          label="State Effects JSON"
          helperText='Example: {"trust": 1}'
        >
          <textarea
            rows={4}
            value={draft.stateEffectsText}
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
        <Button size="sm" onClick={() => addChoice(selectedNode.id)}>
          <Plus className="size-4" />
          Add Choice
        </Button>
      </div>
    </div>
  );
}
