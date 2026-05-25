"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminBadge,
  AdminFormField,
  AdminKeyValueList,
  adminCheckboxClassName,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "../common/AdminWorkspacePrimitives";
import { cn } from "@/lib/utils";

export default function InteractiveStoryStoryTab({
  story,
  setStory,
  selectedStoryId,
  storyDirty,
  busy,
  validation,
  validationTone,
  selectedStorySummary,
  publicInteractiveHref,
  publicSeriesHref,
  openPublicHref,
  copyPublicHref,
  saveStory,
  createStory,
  loadValidation,
  publishStory,
  openRemoveStoryConfirm,
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminFormField
            label="Story Slug"
            helperText="Used for admin identification and import/export file naming."
          >
            <input
              value={story.slug}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  slug: event.target.value,
                }))
              }
              className={adminInputClassName}
              placeholder="midnight-archive"
            />
          </AdminFormField>

          <AdminFormField
            label="Story Title"
            helperText="Primary title shown to editors and operators."
          >
            <input
              value={story.title}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className={adminInputClassName}
              placeholder="Midnight Archive"
            />
          </AdminFormField>

          <AdminFormField
            label="Linked Series ID"
            helperText="Fill in seriesId if this interactive story should connect to an existing series page."
          >
            <input
              value={story.seriesId}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  seriesId: event.target.value,
                }))
              }
              className={adminInputClassName}
              placeholder="series-011"
            />
          </AdminFormField>

          <AdminFormField
            label="Short Description"
            helperText="A quick positioning line for internal editors and operators."
          >
            <input
              value={story.description}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={adminInputClassName}
              placeholder="A branching thriller driven by suspicion, risk, and hidden clues."
            />
          </AdminFormField>

          <AdminFormField
            label="Cover Image"
            helperText="Cover image URL for /interactive pages."
          >
            <input
              value={story.coverImage}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  coverImage: event.target.value,
                }))
              }
              className={adminInputClassName}
              placeholder="/fallback/cover-default.svg"
            />
          </AdminFormField>

          <AdminFormField
            label="Genre"
            helperText="Short genre label shown to readers."
          >
            <input
              value={story.genre}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  genre: event.target.value,
                }))
              }
              className={adminInputClassName}
              placeholder="Sci-Fi"
            />
          </AdminFormField>

          <AdminFormField
            label="Target Audience"
            helperText="Used when building AI Assist prompts."
          >
            <input
              value={story.targetAudience}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  targetAudience: event.target.value,
                }))
              }
              className={adminInputClassName}
              placeholder="Teens 13-17"
            />
          </AdminFormField>

          <AdminFormField
            label="Content Mode"
            helperText="Strictly isolates normal and adult story pools."
          >
            <select
              value={story.contentMode}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  contentMode: event.target.value,
                }))
              }
              className={adminSelectClassName}
            >
              <option value="normal">normal</option>
              <option value="adult">adult</option>
            </select>
          </AdminFormField>

          <AdminFormField
            label="Publish Status"
            helperText="Controls whether the story can be publicly accessed."
          >
            <select
              value={story.status}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  status: event.target.value,
                  isPublished: event.target.value === "published",
                }))
              }
              className={adminSelectClassName}
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </AdminFormField>
        </div>

        <AdminFormField
          label="World Rules and Base Context"
          helperText="Capture core character relationships, narrative boundaries, and any rules AI must not violate."
        >
          <textarea
            rows={10}
            value={story.baseContext}
            onChange={(event) =>
              setStory((current) => ({
                ...current,
                baseContext: event.target.value,
              }))
            }
            className={adminTextareaClassName}
            placeholder="Describe the setting, character setup, story voice, and any hard boundaries the story must respect."
          />
        </AdminFormField>

        <AdminFormField
          label="Initial State JSON"
          helperText='Example: {"trust": 0, "risk": 1, "flags": []}. This controls the reader state when a new run begins.'
        >
          <textarea
            rows={8}
            value={story.initialStateText}
            onChange={(event) =>
              setStory((current) => ({
                ...current,
                initialStateText: event.target.value,
              }))
            }
            className={adminTextareaClassName}
            placeholder='{"trust": 0, "risk": 1, "clues": 0}'
          />
        </AdminFormField>

        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={story.aiEnabled}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  aiEnabled: event.target.checked,
                }))
              }
              className={adminCheckboxClassName}
            />
            Enable AI Assist
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={story.isPublished}
              onChange={(event) =>
                setStory((current) => ({
                  ...current,
                  isPublished: event.target.checked,
                }))
              }
              className={adminCheckboxClassName}
            />
            Mirror published state
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div
          className={cn(
            "rounded-[24px] border px-4 py-4",
            validationTone === "danger"
              ? "border-rose-200 bg-rose-50"
              : validationTone === "warning"
                ? "border-amber-200 bg-amber-50"
                : validationTone === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)]",
          )}
        >
          <p className="text-sm font-semibold text-slate-950">
            {validation?.ok
              ? "This graph is currently publishable."
              : "This graph still has publish-blocking issues."}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {validation
              ? `Errors ${validation.errors}, warnings ${validation.warnings}`
              : "Save the story first, then run a validation pass."}
          </p>
        </div>

        {selectedStorySummary.length > 0 ? (
          <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">
                Current Story Summary
              </p>
              {storyDirty ? (
                <AdminBadge tone="warning">Unsaved changes</AdminBadge>
              ) : (
                <AdminBadge tone="success">Synced</AdminBadge>
              )}
            </div>
            <div className="mt-3">
              <AdminKeyValueList items={selectedStorySummary} />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={selectedStoryId ? saveStory : createStory}
            disabled={busy}
          >
            <Save className="size-4" />
            {selectedStoryId ? "Save Story Setup" : "Create Story"}
          </Button>

          {publicInteractiveHref ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => openPublicHref(publicInteractiveHref)}
              disabled={!publicInteractiveHref}
            >
              <ArrowUpRight className="size-4" />
              Open Public Interactive Page
            </Button>
          ) : null}

          {publicSeriesHref ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => openPublicHref(publicSeriesHref)}
              disabled={!publicSeriesHref}
            >
              <ArrowUpRight className="size-4" />
              Open Public Series Page
            </Button>
          ) : null}

          {publicInteractiveHref ? (
            <Button
              className="w-full"
              variant="secondary"
              onClick={() =>
                copyPublicHref(
                  publicInteractiveHref,
                  "Interactive page link copied.",
                )
              }
            >
              <Copy className="size-4" />
              Copy Interactive Link
            </Button>
          ) : null}

          {selectedStoryId ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => loadValidation(selectedStoryId)}
            >
              <ShieldCheck className="size-4" />
              Run Validation
            </Button>
          ) : null}

          {selectedStoryId ? (
            <Button
              className="w-full"
              onClick={() => publishStory(true)}
              disabled={busy}
            >
              <CheckCircle2 className="size-4" />
              Publish to Frontend
            </Button>
          ) : null}

          {selectedStoryId ? (
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => publishStory(false)}
              disabled={busy}
            >
              Unpublish from Frontend
            </Button>
          ) : null}

          {selectedStoryId ? (
            <Button
              className="w-full"
              variant="destructive"
              onClick={openRemoveStoryConfirm}
            >
              <Trash2 className="size-4" />
              Delete Story
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
