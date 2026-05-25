import type { Request, Response } from "express";
import { InteractiveStoriesController } from "./interactive-stories.controller";

const resolveAdultGateContextMock = jest.fn();
const getUserIdFromRequestMock = jest.fn();

jest.mock("../../common/utils/adult-gate", () => {
  const actual = jest.requireActual("../../common/utils/adult-gate");
  return {
    ...actual,
    resolveAdultGateContext: (...args: unknown[]) =>
      resolveAdultGateContextMock(...args),
  };
});

jest.mock("../../common/utils/auth", () => ({
  getUserIdFromRequest: (...args: unknown[]) => getUserIdFromRequestMock(...args),
}));

describe("InteractiveStoriesController", () => {
  let controller: InteractiveStoriesController;
  let interactiveStoriesService: Record<string, jest.Mock>;
  let prisma: Record<string, any>;

  function createResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res as unknown as Response;
  }

  beforeEach(() => {
    interactiveStoriesService = {
      listStories: jest.fn(),
      getStoryBySeries: jest.fn(),
      getStoryBySlug: jest.fn(),
      getOrInitProgressBySlug: jest.fn(),
      submitChoiceBySlug: jest.fn(),
      getStory: jest.fn(),
      getOrInitProgress: jest.fn(),
      submitChoice: jest.fn(),
    };

    prisma = {
      userPreference: {
        findUnique: jest.fn(),
      },
    };

    resolveAdultGateContextMock.mockResolvedValue({
      ok: true,
      reason: "OK",
      matureModeEnabled: true,
      verified: true,
      region: "global",
    });
    getUserIdFromRequestMock.mockImplementation(
      (_req: Request, allowGuest = true) => (allowGuest ? "guest" : "user-1"),
    );

    controller = new InteractiveStoriesController(
      interactiveStoriesService as any,
      prisma as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("passes requested adult mode into storyId progress lookup", async () => {
    const req = {
      query: { adult: "1" },
      userId: "user-1",
    } as unknown as Request;
    const res = createResponse();
    const progress = {
      id: "progress-1",
      story: {
        id: "story-1",
        contentMode: "normal",
      },
    };

    interactiveStoriesService.getOrInitProgress.mockResolvedValueOnce(progress);

    const result = await controller.getProgress("story-1", req, res);

    expect(interactiveStoriesService.getOrInitProgress).toHaveBeenCalledWith(
      "story-1",
      "user-1",
      "adult",
    );
    expect(result).toEqual({ progress });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("passes requested adult mode into storyId choice submission", async () => {
    const req = {
      query: { adult: "1" },
      userId: "user-1",
    } as unknown as Request;
    const res = createResponse();
    const story = {
      id: "story-1",
      contentMode: "normal",
    };
    const progress = {
      id: "progress-1",
      story,
    };

    interactiveStoriesService.getStory.mockResolvedValueOnce(story);
    interactiveStoriesService.submitChoice.mockResolvedValueOnce(progress);

    const result = await controller.submitChoice(
      "story-1",
      { choiceId: "choice-1" },
      req,
      res,
    );

    expect(interactiveStoriesService.submitChoice).toHaveBeenCalledWith(
      "story-1",
      "user-1",
      "choice-1",
      "adult",
    );
    expect(result).toEqual({ progress });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks adult list requests when adult gate is not satisfied", async () => {
    const req = {
      query: { adult: "1" },
      cookies: {},
      userId: "user-1",
    } as unknown as Request;
    const res = createResponse();
    resolveAdultGateContextMock.mockResolvedValueOnce({
      ok: false,
      reason: "NEED_ADULT_MODE",
      matureModeEnabled: false,
      verified: true,
      region: "global",
    });

    const result = await controller.listStories("", req, res);

    expect(result).toBeUndefined();
    expect(interactiveStoriesService.listStories).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "ADULT_GATED",
      reason: "NEED_ADULT_MODE",
    });
  });

  it("blocks adult slug detail requests when adult gate is not satisfied", async () => {
    const req = {
      query: { adult: "1" },
      cookies: {},
      userId: "user-1",
    } as unknown as Request;
    const res = createResponse();
    resolveAdultGateContextMock.mockResolvedValueOnce({
      ok: false,
      reason: "NEED_AGE_CONFIRM",
      matureModeEnabled: false,
      verified: false,
      region: "global",
    });

    const result = await controller.getStoryBySlug("velvet-after-dark", req, res);

    expect(result).toBeUndefined();
    expect(interactiveStoriesService.getStoryBySlug).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "ADULT_GATED",
      reason: "NEED_AGE_CONFIRM",
    });
  });

  it("blocks adult current-progress requests before hitting the progress service", async () => {
    const req = {
      query: { adult: "1" },
      cookies: {},
      userId: "user-1",
    } as unknown as Request;
    const res = createResponse();
    getUserIdFromRequestMock.mockReturnValueOnce("user-1");
    resolveAdultGateContextMock.mockResolvedValueOnce({
      ok: false,
      reason: "NEED_LOGIN",
      matureModeEnabled: false,
      verified: false,
      region: "global",
    });

    const result = await controller.getCurrentBySlug("velvet-after-dark", req, res);

    expect(result).toBeUndefined();
    expect(interactiveStoriesService.getOrInitProgressBySlug).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "ADULT_GATED",
      reason: "NEED_LOGIN",
    });
  });

  it("blocks adult choice submissions before hitting the choice service", async () => {
    const req = {
      query: { adult: "1" },
      cookies: {},
      userId: "user-1",
    } as unknown as Request;
    const res = createResponse();
    getUserIdFromRequestMock.mockReturnValueOnce("user-1");
    resolveAdultGateContextMock.mockResolvedValueOnce({
      ok: false,
      reason: "NEED_ADULT_MODE",
      matureModeEnabled: false,
      verified: true,
      region: "global",
    });

    const result = await controller.chooseBySlug(
      "velvet-after-dark",
      { choiceId: "adult-choice-1" },
      req,
      res,
    );

    expect(result).toBeUndefined();
    expect(interactiveStoriesService.submitChoiceBySlug).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "ADULT_GATED",
      reason: "NEED_ADULT_MODE",
    });
  });

  it("returns invalid request when slug detail is missing a slug", async () => {
    const req = {
      query: {},
      userId: "user-1",
    } as unknown as Request;
    const res = createResponse();

    const result = await controller.getStoryBySlug("   ", req, res);

    expect(result).toEqual({
      error: "INVALID_REQUEST",
      message: "slug is required",
    });
    expect(interactiveStoriesService.getStoryBySlug).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns unauthenticated when current progress by slug is requested without a user", async () => {
    const req = {
      query: {},
      cookies: {},
    } as unknown as Request;
    const res = createResponse();
    getUserIdFromRequestMock.mockReturnValueOnce("");

    const result = await controller.getCurrentBySlug("solar-wind", req, res);

    expect(result).toEqual({
      error: "UNAUTHENTICATED",
    });
    expect(interactiveStoriesService.getOrInitProgressBySlug).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("blocks storyId progress lookups behind the adult gate before the service call", async () => {
    const req = {
      query: { adult: "1" },
      cookies: {},
      userId: "user-1",
    } as unknown as Request;
    const res = createResponse();
    getUserIdFromRequestMock.mockReturnValueOnce("user-1");
    resolveAdultGateContextMock.mockResolvedValueOnce({
      ok: false,
      reason: "NEED_ADULT_MODE",
      matureModeEnabled: false,
      verified: true,
      region: "global",
    });

    const result = await controller.getProgress("story-1", req, res);

    expect(result).toBeUndefined();
    expect(interactiveStoriesService.getOrInitProgress).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "ADULT_GATED",
      reason: "NEED_ADULT_MODE",
    });
  });

  it("blocks storyId choice submissions behind the adult gate before loading the story", async () => {
    const req = {
      query: { adult: "1" },
      cookies: {},
      userId: "user-1",
    } as unknown as Request;
    const res = createResponse();
    getUserIdFromRequestMock.mockReturnValueOnce("user-1");
    resolveAdultGateContextMock.mockResolvedValueOnce({
      ok: false,
      reason: "NEED_AGE_CONFIRM",
      matureModeEnabled: false,
      verified: false,
      region: "global",
    });

    const result = await controller.submitChoice(
      "story-1",
      { choiceId: "choice-1" },
      req,
      res,
    );

    expect(result).toBeUndefined();
    expect(interactiveStoriesService.getStory).not.toHaveBeenCalled();
    expect(interactiveStoriesService.submitChoice).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "ADULT_GATED",
      reason: "NEED_AGE_CONFIRM",
    });
  });

  it("returns not found when storyId choice submission mode does not match the story content mode", async () => {
    const req = {
      query: {},
      userId: "user-1",
      cookies: {},
    } as unknown as Request;
    const res = createResponse();
    getUserIdFromRequestMock.mockReturnValueOnce("user-1");
    interactiveStoriesService.getStory.mockResolvedValueOnce(null);

    const result = await controller.submitChoice(
      "adult-story",
      { choiceId: "choice-1" },
      req,
      res,
    );

    expect(interactiveStoriesService.getStory).toHaveBeenCalledWith(
      "adult-story",
      "normal",
    );
    expect(interactiveStoriesService.submitChoice).not.toHaveBeenCalled();
    expect(result).toEqual({
      error: "NOT_FOUND",
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
