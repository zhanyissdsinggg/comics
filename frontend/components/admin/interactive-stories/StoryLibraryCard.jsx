"use client";

import { AdminBadge } from "../common/AdminWorkspacePrimitives";
import { cn } from "@/lib/utils";

export default function StoryLibraryCard({ item, isActive, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[24px] border px-4 py-4 text-left transition",
        isActive
          ? "border-[color:var(--gush-border-strong)] bg-white shadow-[0_16px_36px_rgba(15,23,42,0.05)]"
          : "border-[color:var(--gush-border)] bg-white hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">
            {item.title}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{item.slug}</p>
        </div>
        <AdminBadge tone={item.isPublished ? "success" : "default"}>
          {item.isPublished ? "Published" : "Draft"}
        </AdminBadge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <AdminBadge>{item._count?.nodes || 0} nodes</AdminBadge>
        <AdminBadge>{item._count?.progress || 0} progress</AdminBadge>
        <AdminBadge>{item.series?.title || "Unlinked series"}</AdminBadge>
      </div>
    </button>
  );
}
