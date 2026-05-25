"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageSection, adminInputClassName } from "../common/AdminWorkspacePrimitives";
import StoryLibraryCard from "./StoryLibraryCard";

export default function InteractiveStoryLibrarySection({
  storyQuery,
  setStoryQuery,
  resetToNewStory,
  loading,
  filteredStories,
  selectedStoryId,
  setSelectedStoryId,
  setActiveTab,
}) {
  return (
    <AdminPageSection
      title="Story Library"
      description="Switch between existing interactive stories or start a new one."
    >
      <div className="space-y-4">
        <input
          value={storyQuery}
          onChange={(event) => setStoryQuery(event.target.value)}
          placeholder="Search title, slug, or series"
          className={adminInputClassName}
        />
        <Button variant="outline" className="w-full" onClick={resetToNewStory}>
          <Plus className="size-4" />
          New interactive story
        </Button>
        <div className="space-y-2">
          {loading ? (
            <div className="rounded-[20px] border border-[color:var(--gush-border)] px-4 py-6 text-sm text-slate-500">
              Loading stories...
            </div>
          ) : filteredStories.length > 0 ? (
            filteredStories.map((item) => (
              <StoryLibraryCard
                key={item.id}
                item={item}
                isActive={selectedStoryId === item.id}
                onSelect={() => {
                  setSelectedStoryId(item.id);
                  setActiveTab("nodes");
                }}
              />
            ))
          ) : (
            <div className="rounded-[20px] border border-dashed border-[color:var(--gush-border)] px-4 py-8 text-sm leading-6 text-slate-500">
              No matching interactive stories yet. Create one or try a different search keyword.
            </div>
          )}
        </div>
      </div>
    </AdminPageSection>
  );
}
