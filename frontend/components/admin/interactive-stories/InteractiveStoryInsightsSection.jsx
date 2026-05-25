"use client";

import { BookCopy, GitBranch, ListChecks } from "lucide-react";
import { AdminPageSection } from "../common/AdminWorkspacePrimitives";
import ValidationList from "./ValidationList";

export default function InteractiveStoryInsightsSection({
  validation,
  jumpToNodeKey,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <AdminPageSection
        title="Publish Validation"
        description="Check the graph before publishing so broken links, missing starts, and empty branches do not leak to production."
        accent="blue"
      >
        <ValidationList validation={validation} onJumpNodeKey={jumpToNodeKey} />
      </AdminPageSection>

      <AdminPageSection
        title="Authoring Notes"
        description="Interactive stories still need a clean narrative spine. Each node should have a clear job."
      >
        <div className="space-y-3 text-sm leading-6 text-slate-600">
          <div className="flex items-start gap-3 rounded-[18px] border border-[color:var(--gush-border)] bg-white px-4 py-3">
            <BookCopy className="mt-0.5 size-4 shrink-0 text-slate-500" />
            <p>
              Keep worldbuilding in the base story context. Individual nodes should focus on the current beat, not re-explain the whole setting.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-[18px] border border-[color:var(--gush-border)] bg-white px-4 py-3">
            <GitBranch className="mt-0.5 size-4 shrink-0 text-slate-500" />
            <p>
              Branches should produce meaningful information shifts or emotional differences. Avoid fake branches that read differently but resolve the same way.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-[18px] border border-[color:var(--gush-border)] bg-white px-4 py-3">
            <ListChecks className="mt-0.5 size-4 shrink-0 text-slate-500" />
            <p>
              Keep flags and state effects short and precise. Debugging becomes miserable when state naming gets vague.
            </p>
          </div>
        </div>
      </AdminPageSection>
    </div>
  );
}
