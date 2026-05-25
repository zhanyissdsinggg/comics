"use client";

import { Button } from "@/components/ui/button";
import { AdminBadge } from "../common/AdminWorkspacePrimitives";
import { emptyChoice } from "./formState";
import InteractiveStoryGenerationLogs from "./InteractiveStoryGenerationLogs";
import InteractiveStoryNewChoiceSection from "./InteractiveStoryNewChoiceSection";
import InteractiveStoryChoiceCard from "./InteractiveStoryChoiceCard";

export default function InteractiveStoryBranchEditorSection({
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
}) {
  return (
    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Branch Editor
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Each choice should have a clear reader-facing label, meaningful state
            effects, and a real destination. Avoid fake branches that only look
            different.
          </p>
        </div>
        {selectedNode ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AdminBadge>{selectedNode.choices?.length || 0} choices</AdminBadge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openResequenceChoicesConfirm(selectedNode.id)}
              disabled={
                (selectedNode.choices?.length || 0) === 0 || dirtyNodeCount > 0
              }
            >
              Resequence Choices
            </Button>
          </div>
        ) : null}
      </div>

      {!selectedNode ? (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Select a node before editing its outgoing choices.
        </p>
      ) : selectedNodeChoiceCount === 0 ? (
        <div className="mt-4 rounded-[22px] border border-dashed border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-4 py-6 text-sm leading-6 text-slate-500">
          This node does not have any choices yet. Add the first branch, then
          decide whether it should attach to an existing node or a new target.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {(selectedNode.choices || []).map((choice) => {
            const form = choiceForms[choice.id] || emptyChoice();
            const targetNode = nodes.find((node) => node.id === form.targetNodeId);
            return (
              <InteractiveStoryChoiceCard
                key={choice.id}
                choice={choice}
                form={form}
                targetNode={targetNode}
                nodes={nodes}
                selectedNode={selectedNode}
                busy={busy}
                choiceDirty={Boolean(choiceDirtyById[choice.id])}
                setChoiceForms={setChoiceForms}
                saveChoice={saveChoice}
                setSelectedNodeId={setSelectedNodeId}
                generateNextNode={generateNextNode}
                removeChoice={removeChoice}
                createTargetNodeForChoice={createTargetNodeForChoice}
                copyToClipboard={copyToClipboard}
                setFeedback={setFeedback}
              />
            );
          })}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <InteractiveStoryGenerationLogs
          generationLogs={generationLogs}
          selectedNode={selectedNode}
          setSelectedNodeId={setSelectedNodeId}
          attachChoiceToNode={attachChoiceToNode}
        />

        <InteractiveStoryNewChoiceSection
          selectedNode={selectedNode}
          nodes={nodes}
          newChoiceByNode={newChoiceByNode}
          setNewChoiceByNode={setNewChoiceByNode}
          addChoice={addChoice}
        />
      </div>
    </div>
  );
}
