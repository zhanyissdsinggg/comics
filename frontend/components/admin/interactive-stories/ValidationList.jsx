"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function formatValidationIssue(issue) {
  const code = String(issue?.code || "").trim();
  const nodeKey = String(issue?.nodeKey || "").trim();
  const choiceKey = String(issue?.choiceKey || "").trim();

  const templates = {
    STORY_ID_MISSING: () => "Story ID is missing.",
    NODES_EMPTY: () => "At least one story node is required.",
    NODE_KEY_MISSING: () => "Each node must have a node key.",
    NODE_KEY_DUPLICATED: () =>
      nodeKey ? `Duplicate node key: ${nodeKey}` : "Duplicate node key.",
    INITIAL_NODE_NOT_FOUND: () =>
      "The initialNodeId does not exist in the node list.",
    NODE_NO_CHOICES: () =>
      nodeKey
        ? `Non-ending node is missing choices: ${nodeKey}`
        : "A non-ending node is missing choices.",
    CHOICE_KEY_MISSING: () =>
      nodeKey
        ? `Choice key is missing on node ${nodeKey}`
        : "Choice key is missing.",
    CHOICE_TARGET_MISSING: () =>
      nodeKey
        ? `Choice target is missing: ${nodeKey}${choiceKey ? `.${choiceKey}` : ""}`
        : "Choice target is missing.",
    CHOICE_TARGET_NOT_FOUND: () =>
      nodeKey
        ? `Choice target node was not found: ${nodeKey}${choiceKey ? `.${choiceKey}` : ""}`
        : "Choice target node was not found.",
    UNREACHABLE_ROOTS: () =>
      "Some nodes are unreachable and may be isolated branches.",
  };

  const severity = String(issue?.severity || "").trim() || "warning";
  if (code && templates[code]) {
    return { code, nodeKey, choiceKey, severity, text: templates[code]() };
  }

  const message = String(issue?.message || issue?.text || "").trim();
  return {
    code,
    nodeKey,
    choiceKey,
    severity,
    text: message || "Unknown validation issue.",
  };
}

export default function ValidationList({ validation, onJumpNodeKey }) {
  if (!validation) {
    return (
      <p className="text-sm leading-6 text-slate-500">
        Save the story, then run validation. Blocking publish issues will appear here.
      </p>
    );
  }

  const rawIssues = validation?.issues;
  const issues = Array.isArray(rawIssues)
    ? rawIssues.map((issue) => formatValidationIssue(issue))
    : [
        ...(Array.isArray(rawIssues?.errors)
          ? rawIssues.errors.map((item) => ({
              severity: "error",
              message: item,
            }))
          : []),
        ...(Array.isArray(rawIssues?.warnings)
          ? rawIssues.warnings.map((item) => ({
              severity: "warning",
              message: item,
            }))
          : []),
      ].map((issue) => formatValidationIssue(issue));

  if (issues.length === 0) {
    return (
      <p className="text-sm leading-6 text-emerald-700">
        No publish-blocking issues were found. The graph passed validation.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue, index) => (
        <div
          key={`${issue.code || issue.text || "issue"}-${index}`}
          className={cn(
            "rounded-[18px] border px-3 py-3 text-sm leading-6",
            issue.severity === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {issue.nodeKey ? (
                    <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-black/70">
                      {issue.nodeKey}
                    </span>
                  ) : null}
                  {issue.choiceKey ? (
                    <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-black/70">
                      {issue.choiceKey}
                    </span>
                  ) : null}
                  {issue.code ? (
                    <span className="rounded-full border border-black/10 bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/50">
                      {issue.code}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 break-words">{issue.text}</div>
              </div>
            </div>
            {issue.nodeKey && typeof onJumpNodeKey === "function" ? (
              <button
                type="button"
                onClick={() => onJumpNodeKey(issue.nodeKey)}
                className="shrink-0 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] font-semibold text-black/70 transition hover:bg-white"
              >
                Locate
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
