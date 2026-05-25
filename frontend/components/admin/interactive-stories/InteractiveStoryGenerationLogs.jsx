"use client";

import { Button } from "@/components/ui/button";
import { AdminBadge } from "../common/AdminWorkspacePrimitives";
import { cn } from "@/lib/utils";

function formatReviewStatus(status) {
  const value = String(status || "").trim();
  if (value === "pending_review") return "pending_review";
  if (value === "approved") return "approved";
  if (value === "rejected") return "rejected";
  return "draft";
}

export default function InteractiveStoryGenerationLogs({
  generationLogs,
  selectedNode,
  setSelectedNodeId,
  attachChoiceToNode,
}) {
  if (!generationLogs.length) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            AI Generation Logs
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Recent AI draft runs stay internal here for review, safety tracing,
            and editorial auditing.
          </p>
        </div>
        <AdminBadge tone="accent">{generationLogs.length} logs</AdminBadge>
      </div>
      <div className="mt-4 space-y-3">
        {generationLogs.slice(0, 8).map((log) => {
          const isCurrent = selectedNode?.id && log?.nodeId === selectedNode.id;
          const sourceChoice = log?.choice;
          return (
            <div
              key={log.id}
              className={cn(
                "rounded-[18px] border p-3",
                isCurrent
                  ? "border-[color:var(--gush-border-strong)] bg-[color:var(--gush-page-bg-muted)]/70"
                  : "border-[color:var(--gush-border)] bg-white",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <AdminBadge
                  tone={
                    log.reviewStatus === "approved"
                      ? "success"
                      : log.reviewStatus === "rejected"
                        ? "danger"
                        : "warning"
                  }
                >
                  {formatReviewStatus(log.reviewStatus || log.status)}
                </AdminBadge>
                <AdminBadge>{log.contentMode || "normal"}</AdminBadge>
                <AdminBadge>{log.generationType || "draft"}</AdminBadge>
                {log?.node?.title ? <AdminBadge>{log.node.title}</AdminBadge> : null}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {sourceChoice?.node?.title ? `${sourceChoice.node.title} / ` : ""}
                {sourceChoice?.label ||
                  sourceChoice?.choiceKey ||
                  "No source choice"}
              </p>
              {log?.safetyNotes ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Safety: {log.safetyNotes}
                </p>
              ) : null}
              {log?.prompt ? (
                <details className="mt-3 rounded-[14px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                    View Prompt
                  </summary>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">
                    {log.prompt}
                  </pre>
                </details>
              ) : null}
              {log?.response ? (
                <details className="mt-3 rounded-[14px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                    View Response
                  </summary>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">
                    {log.response}
                  </pre>
                </details>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {log?.nodeId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedNodeId(log.nodeId)}
                  >
                    Open Node
                  </Button>
                ) : null}
                {log?.choice?.id && log?.nodeId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => attachChoiceToNode(log.choice.id, log.nodeId)}
                    disabled={(log?.reviewStatus || "draft") !== "approved"}
                  >
                    绑定分支
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
