"use client";

import { ArrowRight, Copy, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminBadge,
  AdminFormField,
  adminCheckboxClassName,
  adminInputClassName,
  adminTextareaClassName,
} from "../common/AdminWorkspacePrimitives";
import { cn } from "@/lib/utils";

export default function InteractiveStoryNodeMapSection({
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
}) {
  const newNodeReady = Boolean(
    String(nodeDraft?.nodeKey || "").trim() &&
      String(nodeDraft?.title || "").trim(),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-4">
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Current Node
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {selectedNode?.title || "No node selected"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {selectedNode?.nodeKey || "Pick a node from the map to inspect it"}
          </p>
        </div>
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Unsaved
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {dirtyNodeCount} node{dirtyNodeCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {dirtyNodeCount > 0
              ? "Save pending edits before resequencing or validating jump paths."
              : "The current node workspace is clean."}
          </p>
        </div>
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Branching
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {selectedNodeChoiceCount} choice{selectedNodeChoiceCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {selectedNode
              ? selectedNodeTargets.length > 0
                ? `${selectedNodeTargets.length} target node${selectedNodeTargets.length === 1 ? "" : "s"} linked from here`
                : "This node does not have a valid outgoing target yet."
              : "Select a node to preview its branch footprint."}
          </p>
        </div>
        <div className="rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            New Node
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {newNodeReady ? "Ready to create" : "Add a key and title first"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Lock the skeleton first, then refine context, state rules, and AI guidance.
          </p>
        </div>
      </div>

      <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Node Map</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Lay out the spine, pivots, and endings first. Tighten copy and branch
              conditions node by node after the graph is stable.
            </p>
          </div>
          {detail?.initialNodeId ? (
            <AdminBadge tone="accent">
              Start node:{" "}
              {nodes.find((item) => item.id === detail.initialNodeId)?.title ||
                "Untitled node"}
            </AdminBadge>
          ) : (
            <AdminBadge tone="warning">Start node not set</AdminBadge>
          )}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={nodeQuery}
              onChange={(event) => setNodeQuery(event.target.value)}
              data-testid="admin-interactive-node-search"
              placeholder="Search node titles, keys, or choice labels"
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
            Clear Filters
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={openResequenceNodesConfirm}
            disabled={!selectedStoryId || nodes.length === 0 || dirtyNodeCount > 0}
          >
            Resequence Nodes
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
            Resequence Current Choices
          </Button>
          {dirtyNodeCount > 0 ? (
            <span className="self-center text-xs text-amber-600">
              Unsaved edits found. Save first before resequencing.
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {nodeFilters.map((filter) => {
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
            {filteredNodes.length} / {nodes.length} nodes
          </AdminBadge>
          <AdminBadge tone={dirtyNodeCount > 0 ? "warning" : "default"}>
            {dirtyNodeCount} unsaved node{dirtyNodeCount === 1 ? "" : "s"}
          </AdminBadge>
          <AdminBadge>
            {nodes.filter((node) => (node.choices?.length || 0) === 0).length} empty branch
            {nodes.filter((node) => (node.choices?.length || 0) === 0).length === 1
              ? ""
              : "es"}
          </AdminBadge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {nodes.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-white px-4 py-10 text-sm leading-6 text-slate-500">
              This story does not have any nodes yet. Create the first start node on
              the right, then come back and spread the branches.
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-white px-4 py-10 text-sm leading-6 text-slate-500">
              No nodes match the current search or filter. Try another keyword or
              switch the filter back to All.
            </div>
          ) : (
            filteredNodes.map((node) => {
              const outgoingChoices = Array.isArray(node.choices) ? node.choices : [];
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
                          ? "Start"
                          : node.isEnding
                            ? "Ending"
                            : `${outgoingChoices.length} choices`}
                      </AdminBadge>
                      {nodeDirtyById[node.id] ||
                      outgoingChoices.some((choice) => choiceDirtyById[choice.id]) ? (
                        <AdminBadge tone="warning">Unsaved</AdminBadge>
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
                                : "→ No target node"}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400">
                        This node does not have any choices yet.
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
            <h3 className="text-sm font-semibold text-slate-950">Create Node</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Write the foundation first. You can refine branch conditions, state
              effects, and AI behavior after the node exists.
            </p>
          </div>
          <AdminBadge>Draft</AdminBadge>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {selectedNode?.title || "Untitled node"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedNode?.nodeKey || "Node key not set"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminBadge>{selectedNodeChoiceCount} choices</AdminBadge>
                <AdminBadge>{selectedNodeTargets.length} targets</AdminBadge>
                <AdminBadge tone={selectedNode?.aiEnabled ? "accent" : "default"}>
                  {selectedNode?.aiEnabled ? "AI enabled" : "AI disabled"}
                </AdminBadge>
                {selectedNode?.nodeKey ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyToClipboard(selectedNode.nodeKey);
                      setFeedback({
                        type: ok ? "success" : "error",
                        message: ok
                          ? "Node key copied"
                          : "Copy failed. Please copy the node key manually.",
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
            <AdminFormField label="Node Title">
              <input
                value={nodeDraft.title}
                onChange={(event) =>
                  setNodeDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className={adminInputClassName}
                placeholder="Midnight Archive"
              />
            </AdminFormField>
            <AdminFormField label="Sort Order">
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
              label="Fallback Text"
              helperText="Reader-safe fallback copy if AI generation is unavailable."
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
                placeholder="The curtain shifts, and you steady yourself before moving again."
              />
            </AdminFormField>
          </div>

          <AdminFormField label="Node Context">
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
              placeholder="What is happening here, and what information does the reader already have?"
            />
          </AdminFormField>

          <AdminFormField label="AI Prompt">
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
              placeholder="Describe the tone, visual feel, and mandatory story beats for this node."
            />
          </AdminFormField>

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField
              label="Required Flags"
              helperText="Comma or newline separated, for example met_editor, unlocked_note."
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
              label="Blocked Flags"
              helperText="If any of these flags are present, this node should stay inaccessible."
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

          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField label="Node Body">
              <textarea
                rows={5}
                value={nodeDraft.body}
                onChange={(event) =>
                  setNodeDraft((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                className={adminTextareaClassName}
                placeholder="Main reader-facing text for this node."
              />
            </AdminFormField>
            <div className="space-y-4">
              <AdminFormField label="Node Image URL">
                <input
                  value={nodeDraft.imageUrl}
                  onChange={(event) =>
                    setNodeDraft((current) => ({
                      ...current,
                      imageUrl: event.target.value,
                    }))
                  }
                  className={adminInputClassName}
                  placeholder="/images/interactive/node-01.jpg"
                />
              </AdminFormField>
              <div className="grid gap-4 md:grid-cols-2">
                <AdminFormField label="Ending Type">
                  <input
                    value={nodeDraft.endingType}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        endingType: event.target.value,
                      }))
                    }
                    className={adminInputClassName}
                    placeholder="good-ending"
                  />
                </AdminFormField>
                <AdminFormField label="Order Index">
                  <input
                    type="number"
                    value={nodeDraft.orderIndex}
                    onChange={(event) =>
                      setNodeDraft((current) => ({
                        ...current,
                        orderIndex: event.target.value,
                      }))
                    }
                    className={adminInputClassName}
                  />
                </AdminFormField>
              </div>
            </div>
          </div>

          <AdminFormField
            label="State Effects JSON"
            helperText='Example: {"trust": 1, "flagsAdd": ["met_editor"]}'
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
                checked={Boolean(nodeDraft.isEnding)}
                onChange={(event) =>
                  setNodeDraft((current) => ({
                    ...current,
                    isEnding: event.target.checked,
                  }))
                }
                className={adminCheckboxClassName}
              />
              Mark as ending node
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(nodeDraft.aiEnabled)}
                onChange={(event) =>
                  setNodeDraft((current) => ({
                    ...current,
                    aiEnabled: event.target.checked,
                  }))
                }
                className={adminCheckboxClassName}
              />
              Allow AI on this node
            </label>
          </div>

          <Button onClick={createNode} disabled={!selectedStoryId}>
            <Plus className="size-4" />
            Create Node
          </Button>
        </div>
      </div>
    </div>
  );
}
