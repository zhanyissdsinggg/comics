"use client";

import {
  CheckCircle2,
  FileJson,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminBadge,
  adminInputClassName,
} from "../common/AdminWorkspacePrimitives";
import { cn } from "@/lib/utils";
import { mapPanelReviewToForm } from "./formState";

function parsePanelBlueprint(promptJson, fallbackPanelNumber = 1) {
  const payload =
    promptJson && typeof promptJson === "object" && !Array.isArray(promptJson)
      ? promptJson
      : {};
  return {
    panelNumber: Number(payload.panelNumber || fallbackPanelNumber),
    character: String(payload.character || "").trim(),
    scene: String(payload.scene || "").trim(),
    camera: String(payload.camera || "").trim(),
    emotion: String(payload.emotion || "").trim(),
    action: String(payload.action || "").trim(),
    style: String(payload.style || "").trim(),
    dialogue: String(payload.dialogue || "").trim(),
    revisedPrompt: String(payload.revisedPrompt || "").trim(),
  };
}

function formatPanelStatus(status) {
  const value = String(status || "").trim();
  if (value === "pending_review") return "Pending Review";
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Draft";
}

export default function InteractiveStoryPanelsSection({
  busy,
  selectedNode,
  selectedPanels,
  selectedPanelPendingCount,
  panelReviewForms,
  setPanelReviewForms,
  generateStoryboardForNode,
  generatePanelsForNode,
  approvePanel,
  rejectPanel,
  regeneratePanel,
}) {
  if (!selectedNode) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            AI Comic Panels
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Generate storyboard JSON first, then prepare 1-3 panel drafts for
            this node. All images and metadata stay in review until approved,
            and dialogue always stays as frontend overlay text instead of being
            baked into the image.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminBadge>{selectedPanels.length} panels</AdminBadge>
          <AdminBadge
            tone={selectedPanelPendingCount > 0 ? "warning" : "default"}
          >
            {selectedPanelPendingCount} pending review
          </AdminBadge>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => generateStoryboardForNode(selectedNode.id)}
          disabled={busy}
        >
          <FileJson className="size-4" />
          Generate Storyboard
        </Button>
        <Button
          size="sm"
          onClick={() => generatePanelsForNode(selectedNode.id)}
          disabled={busy || selectedPanels.length === 0}
        >
          <Sparkles className="size-4" />
          Generate Panels
        </Button>
      </div>

      {selectedPanels.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-dashed border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-4 py-5 text-sm leading-6 text-slate-500">
          No panel metadata exists yet. Generate a storyboard first, then create
          panel images and send them through review.
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {selectedPanels.map((panel) => {
            const blueprint = parsePanelBlueprint(
              panel.promptJson,
              panel.panelNumber,
            );
            const reviewForm =
              panelReviewForms[panel.id] || mapPanelReviewToForm(panel);
            const previewImage = panel.finalImageUrl || panel.imageUrl || "";
            const status =
              String(panel.reviewStatus || "draft").trim() || "draft";

            return (
              <div
                key={panel.id}
                className="rounded-[20px] border border-[color:var(--gush-border)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Panel {panel.panelNumber}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {blueprint.camera || "No camera note"} /{" "}
                      {blueprint.emotion || "No emotion note"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminBadge
                      tone={
                        status === "approved"
                          ? "success"
                          : status === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {formatPanelStatus(status)}
                    </AdminBadge>
                    {panel.model ? <AdminBadge>{panel.model}</AdminBadge> : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="overflow-hidden rounded-[18px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/70">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={`Interactive panel ${panel.panelNumber}`}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center px-4 text-center text-xs text-slate-500">
                        No image generated yet
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[16px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Character
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {blueprint.character || "Not set"}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Scene
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {blueprint.scene || "Not set"}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Action
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {blueprint.action || "Not set"}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Style
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {blueprint.style || "Not set"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Dialogue Overlay
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {blueprint.dialogue ||
                          panel.dialogue ||
                          "No dialogue overlay"}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[16px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Draft Asset URL
                        </p>
                        <p className="mt-2 break-all text-sm leading-6 text-slate-700">
                          {panel.imageUrl || "No draft image yet"}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Published Asset URL
                        </p>
                        <p className="mt-2 break-all text-sm leading-6 text-slate-700">
                          {panel.finalImageUrl || "Not published yet"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]/60 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Final Image URL
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        If provided, this URL becomes the public-approved asset on
                        approval. If left empty, the current draft image URL is
                        used as the approved asset.
                      </p>
                      <input
                        type="text"
                        value={reviewForm.finalImageUrl || ""}
                        data-testid={`admin-panel-final-url-${panel.id}`}
                        onChange={(event) =>
                          setPanelReviewForms((current) => ({
                            ...current,
                            [panel.id]: {
                              ...(current[panel.id] ||
                                mapPanelReviewToForm(panel)),
                              finalImageUrl: event.target.value,
                            },
                          }))
                        }
                        className={cn(adminInputClassName, "mt-3")}
                        placeholder="https://cdn.example.com/final-panel.png"
                      />
                      {panel.imageUrl ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPanelReviewForms((current) => ({
                                ...current,
                                [panel.id]: {
                                  ...(current[panel.id] ||
                                    mapPanelReviewToForm(panel)),
                                  finalImageUrl: panel.imageUrl || "",
                                },
                              }))
                            }
                            disabled={busy}
                          >
                            Use Draft Image URL
                          </Button>
                          {panel.finalImageUrl ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPanelReviewForms((current) => ({
                                  ...current,
                                  [panel.id]: {
                                    ...(current[panel.id] ||
                                      mapPanelReviewToForm(panel)),
                                    finalImageUrl: panel.finalImageUrl || "",
                                  },
                                }))
                              }
                              disabled={busy}
                            >
                              Reset To Published URL
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => regeneratePanel(panel.id)}
                        disabled={busy}
                      >
                        <RefreshCw className="size-4" />
                        Regenerate
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approvePanel(panel.id)}
                        data-testid={`admin-panel-approve-${panel.id}`}
                        disabled={
                          busy ||
                          !(
                            String(reviewForm.finalImageUrl || "").trim() ||
                            panel.imageUrl
                          )
                        }
                      >
                        <CheckCircle2 className="size-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectPanel(panel.id)}
                        disabled={busy}
                      >
                        <Trash2 className="size-4" />
                        Reject
                      </Button>
                      {!panel.imageUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            generatePanelsForNode(selectedNode.id, [
                              panel.panelNumber,
                            ])
                          }
                          disabled={busy}
                        >
                          Generate This Panel
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
