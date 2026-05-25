"use client";

import InteractiveStoryNodeEditorSection from "./InteractiveStoryNodeEditorSection";
import InteractiveStoryNodeMapSection from "./InteractiveStoryNodeMapSection";
import InteractiveStoryPanelsSection from "./InteractiveStoryPanelsSection";
import InteractiveStoryBranchEditorSection from "./InteractiveStoryBranchEditorSection";
import useInteractiveStoryNodesViewModel from "./useInteractiveStoryNodesViewModel";

export default function InteractiveStoryNodesTab(props) {
  const {
    nodeMapSectionProps,
    nodeEditorSectionProps,
    panelsSectionProps,
    branchEditorSectionProps,
  } = useInteractiveStoryNodesViewModel(props);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <InteractiveStoryNodeMapSection {...nodeMapSectionProps} />
        </div>

        <div className="space-y-4">
          <InteractiveStoryNodeEditorSection {...nodeEditorSectionProps} />
          <InteractiveStoryPanelsSection {...panelsSectionProps} />
          <InteractiveStoryBranchEditorSection {...branchEditorSectionProps} />
        </div>
      </div>
    </div>
  );
}
