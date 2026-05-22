import { PreferencesController } from "./preferences.controller";
import { getUserIdFromRequest } from "../../common/utils/auth";

jest.mock("../../common/utils/auth", () => ({
  getUserIdFromRequest: jest.fn(),
}));

describe("PreferencesController", () => {
  let controller: PreferencesController;
  let prisma: {
    userPreference: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };
  let res: {
    status: jest.Mock;
  };

  const mockedGetUserIdFromRequest = getUserIdFromRequest as jest.MockedFunction<
    typeof getUserIdFromRequest
  >;

  beforeEach(() => {
    prisma = {
      userPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
    };

    controller = new PreferencesController(prisma as never);
    mockedGetUserIdFromRequest.mockReset();
  });

  it("returns the default preferences for guests", async () => {
    mockedGetUserIdFromRequest.mockReturnValue(null);

    const result = await controller.getPreferences({} as never, res as never);

    expect(prisma.userPreference.findUnique).not.toHaveBeenCalled();
    expect(result).toEqual({
      preferences: {
        notifyNewEpisode: true,
        notifyTtfReady: true,
        notifyPromo: true,
        region: "global",
        language: "en",
        hideAdultHistory: false,
        displayName: "",
        matureModeEnabled: false,
        matureVerification: {
          verified: false,
          provider: "local-gate",
          region: "global",
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
      },
    });
  });

  it("parses stored JSON payloads for signed-in users", async () => {
    mockedGetUserIdFromRequest.mockReturnValue("user-1");
    prisma.userPreference.findUnique.mockResolvedValue({
      payload: JSON.stringify({
        notifyNewEpisode: false,
        notifyPromo: false,
        language: "ko",
        displayName: "QA Reader",
      }),
    });

    const result = await controller.getPreferences({} as never, res as never);

    expect(prisma.userPreference.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(result).toEqual({
      preferences: {
        notifyNewEpisode: false,
        notifyTtfReady: true,
        notifyPromo: false,
        region: "global",
        language: "ko",
        hideAdultHistory: false,
        displayName: "QA Reader",
        matureModeEnabled: false,
        matureVerification: {
          verified: false,
          provider: "local-gate",
          region: "global",
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
      },
    });
  });

  it("falls back to the legacy settings column when payload is empty", async () => {
    mockedGetUserIdFromRequest.mockReturnValue("user-1");
    prisma.userPreference.findUnique.mockResolvedValue({
      payload: null,
      settings: JSON.stringify({
        region: "us",
        hideAdultHistory: true,
      }),
    });

    const result = await controller.getPreferences({} as never, res as never);

    expect(result).toEqual({
      preferences: {
        notifyNewEpisode: true,
        notifyTtfReady: true,
        notifyPromo: true,
        region: "us",
        language: "en",
        hideAdultHistory: true,
        displayName: "",
        matureModeEnabled: false,
        matureVerification: {
          verified: false,
          provider: "local-gate",
          region: "us",
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
      },
    });
  });

  it("serializes normalized preference payloads when saving", async () => {
    mockedGetUserIdFromRequest.mockReturnValue("user-1");
    prisma.userPreference.upsert.mockResolvedValue({
      payload: JSON.stringify({
        notifyNewEpisode: false,
        notifyTtfReady: true,
        notifyPromo: false,
        region: "global",
        language: "en",
        hideAdultHistory: true,
        displayName: "QA Save Test",
        matureModeEnabled: false,
        matureVerification: {
          verified: false,
          provider: "local-gate",
          region: "global",
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
      }),
    });

    const result = await controller.save(
      {
        preferences: {
          notifyNewEpisode: false,
          notifyPromo: false,
          hideAdultHistory: true,
          displayName: "QA Save Test",
        },
      },
      {} as never,
      res as never,
    );

    expect(prisma.userPreference.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      update: {
        payload: JSON.stringify({
          notifyNewEpisode: false,
          notifyTtfReady: true,
          notifyPromo: false,
          region: "global",
          language: "en",
          hideAdultHistory: true,
          displayName: "QA Save Test",
          matureModeEnabled: false,
          matureVerification: {
            verified: false,
            provider: "local-gate",
            region: "global",
            expiresAt: null,
            referenceId: null,
            verifiedAt: null,
          },
        }),
      },
      create: {
        userId: "user-1",
        payload: JSON.stringify({
          notifyNewEpisode: false,
          notifyTtfReady: true,
          notifyPromo: false,
          region: "global",
          language: "en",
          hideAdultHistory: true,
          displayName: "QA Save Test",
          matureModeEnabled: false,
          matureVerification: {
            verified: false,
            provider: "local-gate",
            region: "global",
            expiresAt: null,
            referenceId: null,
            verifiedAt: null,
          },
        }),
      },
    });
    expect(result).toEqual({
      preferences: {
        notifyNewEpisode: false,
        notifyTtfReady: true,
        notifyPromo: false,
        region: "global",
        language: "en",
        hideAdultHistory: true,
        displayName: "QA Save Test",
        matureModeEnabled: false,
        matureVerification: {
          verified: false,
          provider: "local-gate",
          region: "global",
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
      },
    });
  });

  it("ignores client attempts to self-verify mature access through preferences save", async () => {
    mockedGetUserIdFromRequest.mockReturnValue("user-1");
    prisma.userPreference.findUnique.mockResolvedValue({
      payload: JSON.stringify({
        region: "global",
        matureModeEnabled: false,
        matureVerification: {
          verified: false,
          provider: "local-gate",
          region: "global",
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
      }),
    });
    prisma.userPreference.upsert.mockResolvedValue({
      payload: JSON.stringify({
        notifyNewEpisode: true,
        notifyTtfReady: true,
        notifyPromo: true,
        region: "global",
        language: "en",
        hideAdultHistory: false,
        displayName: "",
        matureModeEnabled: true,
        matureVerification: {
          verified: false,
          provider: "local-gate",
          region: "global",
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
      }),
    });

    const result = await controller.save(
      {
        preferences: {
          matureModeEnabled: true,
          matureVerification: {
            verified: true,
            provider: "local-gate",
            region: "global",
            expiresAt: null,
            referenceId: "forged",
            verifiedAt: "2026-05-22T09:00:00.000Z",
          },
        },
      },
      {} as never,
      res as never,
    );

    const upsertPayload = JSON.parse(
      prisma.userPreference.upsert.mock.calls[0][0].update.payload,
    );
    expect(upsertPayload.matureModeEnabled).toBe(true);
    expect(upsertPayload.matureVerification).toEqual({
      verified: false,
      provider: "local-gate",
      region: "global",
      expiresAt: null,
      referenceId: null,
      verifiedAt: null,
    });
    expect(result).toEqual({
      preferences: expect.objectContaining({
        matureModeEnabled: true,
        matureVerification: {
          verified: false,
          provider: "local-gate",
          region: "global",
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
      }),
    });
  });

  it("stores service-managed mature verification through the confirm endpoint", async () => {
    mockedGetUserIdFromRequest.mockReturnValue("user-1");
    prisma.userPreference.findUnique.mockResolvedValue({
      payload: JSON.stringify({
        region: "global",
        matureModeEnabled: false,
        matureVerification: {
          verified: false,
          provider: "local-gate",
          region: "global",
          expiresAt: null,
          referenceId: null,
          verifiedAt: null,
        },
      }),
    });
    prisma.userPreference.upsert.mockImplementation(async ({ update }) => ({
      payload: update.payload,
    }));

    const result = await controller.confirmMatureAccess(
      {
        region: "us",
        matureModeEnabled: true,
      },
      {} as never,
      res as never,
    );

    const upsertPayload = JSON.parse(
      prisma.userPreference.upsert.mock.calls[0][0].update.payload,
    );
    expect(upsertPayload.region).toBe("us");
    expect(upsertPayload.matureModeEnabled).toBe(true);
    expect(upsertPayload.matureVerification).toEqual(
      expect.objectContaining({
        verified: true,
        provider: "local-gate",
        region: "us",
        expiresAt: null,
        referenceId: null,
      }),
    );
    expect(typeof upsertPayload.matureVerification.verifiedAt).toBe("string");
    expect(result).toEqual({
      preferences: expect.objectContaining({
        region: "us",
        matureModeEnabled: true,
        matureVerification: expect.objectContaining({
          verified: true,
          provider: "local-gate",
          region: "us",
        }),
      }),
    });
  });

  it("rejects unauthenticated saves instead of writing guest junk", async () => {
    mockedGetUserIdFromRequest.mockReturnValue(null);

    const result = await controller.save({ preferences: {} }, {} as never, res as never);

    expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(result).toEqual(
      expect.objectContaining({
        error: "UNAUTHENTICATED",
      }),
    );
  });

  it("rejects unauthenticated mature confirm requests", async () => {
    mockedGetUserIdFromRequest.mockReturnValue(null);

    const result = await controller.confirmMatureAccess(
      { region: "global" },
      {} as never,
      res as never,
    );

    expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(result).toEqual(
      expect.objectContaining({
        error: "UNAUTHENTICATED",
      }),
    );
  });
});
