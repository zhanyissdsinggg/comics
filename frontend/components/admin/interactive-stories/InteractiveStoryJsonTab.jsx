"use client";

import { Download, FileJson, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminFormField,
  adminSelectClassName,
  adminTextareaClassName,
} from "../common/AdminWorkspacePrimitives";

export default function InteractiveStoryJsonTab({
  importMode,
  setImportMode,
  importText,
  setImportText,
  importStory,
  busy,
  selectedStoryId,
  exportStory,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <AdminFormField
          label="Import Mode"
          helperText="Create mode keeps existing stories intact. Replace mode rebuilds the current story from the payload."
        >
          <select
            value={importMode}
            onChange={(event) => setImportMode(event.target.value)}
            className={adminSelectClassName}
          >
            <option value="create">Create story</option>
            <option value="replace">Replace current story</option>
          </select>
        </AdminFormField>
        <AdminFormField label="Import JSON">
          <textarea
            rows={20}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            className={adminTextareaClassName}
            placeholder='{"story": {...}, "nodes": [...]}'
          />
        </AdminFormField>
        <div className="flex flex-wrap gap-2">
          <Button onClick={importStory} disabled={busy}>
            <Upload className="size-4" />
            Run import
          </Button>
          {selectedStoryId ? (
            <Button variant="outline" onClick={exportStory}>
              <Download className="size-4" />
              Export current story
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 text-slate-950">
            <FileJson className="size-4" />
            <p className="font-semibold">Recommended Workflow</p>
          </div>
          <div className="mt-3 space-y-2 leading-6">
            <p>1. Start from the template to import a story shell and baseline nodes.</p>
            <p>2. Return to the node editor to fill in context, conditions, and state effects.</p>
            <p>3. Run validation until the error count reaches zero.</p>
            <p>4. Walk the main path and endings before publishing.</p>
          </div>
        </div>
        <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 text-slate-950">
            <Sparkles className="size-4" />
            <p className="font-semibold">Payload Guidance</p>
          </div>
          <div className="mt-3 space-y-2 leading-6">
            <p>Story layer: title, description, base context, initial state.</p>
            <p>Node layer: nodeKey, title, baseContext, basePrompt, fallbackText.</p>
            <p>Choice layer: choiceKey, label, target node, conditions, state effects.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
