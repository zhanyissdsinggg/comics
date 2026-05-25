import { validateInteractiveStoryGraph } from "./interactive-story-validation";

describe("validateInteractiveStoryGraph", () => {
  it("passes a reachable graph with one ending", () => {
    const result = validateInteractiveStoryGraph({
      id: "story-1",
      contentMode: "NORMAL",
      initialNodeId: "node-1",
      series: { adult: false },
      nodes: [
        {
          id: "node-1",
          nodeKey: "start",
          isEnding: false,
          choices: [
            { choiceKey: "left", targetNodeId: "node-2" },
            { choiceKey: "right", targetNodeId: "node-2" },
          ],
        },
        {
          id: "node-2",
          nodeKey: "ending",
          isEnding: true,
          choices: [],
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toBe(0);
  });

  it("fails when initial node is missing and target node is missing", () => {
    const result = validateInteractiveStoryGraph({
      id: "story-1",
      contentMode: "NORMAL",
      initialNodeId: "missing-node",
      series: { adult: false },
      nodes: [
        {
          id: "node-1",
          nodeKey: "start",
          isEnding: false,
          choices: [
            { choiceKey: "left", targetNodeId: null },
            { choiceKey: "right", targetNodeId: "node-404" },
          ],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "INITIAL_NODE_NOT_FOUND")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "CHOICE_TARGET_MISSING")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "CHOICE_TARGET_NOT_FOUND")).toBe(true);
  });

  it("fails when non-ending node does not have 2-4 choices", () => {
    const result = validateInteractiveStoryGraph({
      id: "story-1",
      contentMode: "NORMAL",
      initialNodeId: "node-1",
      series: { adult: false },
      nodes: [
        {
          id: "node-1",
          nodeKey: "start",
          isEnding: false,
          choices: [{ choiceKey: "only", targetNodeId: "node-2" }],
        },
        {
          id: "node-2",
          nodeKey: "ending",
          isEnding: true,
          choices: [],
        },
      ],
    });

    expect(result.issues.some((issue) => issue.code === "NODE_CHOICE_COUNT_INVALID")).toBe(true);
  });

  it("fails when ending node has normal choices or no reachable ending exists", () => {
    const result = validateInteractiveStoryGraph({
      id: "story-1",
      contentMode: "NORMAL",
      initialNodeId: "node-1",
      series: { adult: false },
      nodes: [
        {
          id: "node-1",
          nodeKey: "start",
          isEnding: false,
          choices: [
            { choiceKey: "left", targetNodeId: "node-2" },
            { choiceKey: "right", targetNodeId: "node-2" },
          ],
        },
        {
          id: "node-2",
          nodeKey: "bad-ending",
          isEnding: true,
          choices: [{ choiceKey: "continue", targetNodeId: "node-1" }],
        },
      ],
    });

    expect(result.issues.some((issue) => issue.code === "ENDING_NODE_HAS_CHOICES")).toBe(true);
  });

  it("fails when normal story contains adult signals or adult linked series", () => {
    const result = validateInteractiveStoryGraph({
      id: "story-1",
      title: "Adult Heat",
      description: "nsfw setup",
      contentMode: "NORMAL",
      initialNodeId: "node-1",
      series: { adult: true, badges: ["18+"] },
      nodes: [
        {
          id: "node-1",
          nodeKey: "start",
          title: "Explicit setup",
          isEnding: false,
          choices: [
            { choiceKey: "left", label: "Adult route", targetNodeId: "node-2" },
            { choiceKey: "right", targetNodeId: "node-2" },
          ],
        },
        {
          id: "node-2",
          nodeKey: "ending",
          isEnding: true,
          choices: [],
        },
      ],
    });

    expect(result.issues.some((issue) => issue.code === "NORMAL_LINKED_ADULT_SERIES")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "NORMAL_STORY_ADULT_CONTENT")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "NORMAL_NODE_ADULT_CONTENT")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "NORMAL_CHOICE_ADULT_CONTENT")).toBe(true);
  });
});
