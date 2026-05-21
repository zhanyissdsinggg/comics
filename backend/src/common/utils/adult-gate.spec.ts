import { checkAdultGate, resolveAdultGateContext } from "./adult-gate";

describe("adult gate", () => {
  it("rejects forged mature cookies without a real session", async () => {
    const prisma = {
      userPreference: {
        findUnique: jest.fn(),
      },
    };

    await expect(
      resolveAdultGateContext(prisma as never, {
        cookies: {
          mn_is_signed_in: "1",
          mn_adult_confirmed: "1",
          mn_adult_mode: "1",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "NEED_LOGIN",
      matureModeEnabled: false,
      verified: false,
      region: "global",
    });

    expect(prisma.userPreference.findUnique).not.toHaveBeenCalled();
    expect(
      checkAdultGate({
        mn_is_signed_in: "1",
        mn_adult_confirmed: "1",
        mn_adult_mode: "1",
      }),
    ).toEqual({
      ok: false,
      reason: "NEED_LOGIN",
    });
  });

  it("allows adult access only when stored preferences are verified and enabled", async () => {
    const prisma = {
      userPreference: {
        findUnique: jest.fn().mockResolvedValue({
          payload: JSON.stringify({
            region: "global",
            matureModeEnabled: true,
            matureVerification: {
              verified: true,
              region: "global",
              expiresAt: null,
            },
          }),
        }),
      },
    };

    await expect(
      resolveAdultGateContext(prisma as never, {
        userId: "user-1",
        cookies: {
          mn_is_signed_in: "1",
          mn_adult_confirmed: "1",
          mn_adult_mode: "1",
          mn_age_rule: "global",
        },
      }),
    ).resolves.toEqual({
      ok: true,
      reason: "OK",
      matureModeEnabled: true,
      verified: true,
      region: "global",
    });
  });
});
