import {
  buildAdminVisibleCommentWhere,
  buildAdminVisibleOrderWhere,
  buildAdminVisibleSupportTicketWhere,
  buildAdminVisibleUserWhere,
  readIncludeTestDataFlag,
} from "./admin-visible-data";

describe("admin-visible-data", () => {
  it("treats includeTestData flag as opt-in only", () => {
    expect(readIncludeTestDataFlag(undefined)).toBe(false);
    expect(readIncludeTestDataFlag("")).toBe(false);
    expect(readIncludeTestDataFlag("true")).toBe(true);
    expect(readIncludeTestDataFlag("1")).toBe(true);
    expect(readIncludeTestDataFlag("yes")).toBe(true);
    expect(readIncludeTestDataFlag("false")).toBe(false);
  });

  it("adds non-test exclusions to user queries by default", () => {
    const where = buildAdminVisibleUserWhere({
      email: { contains: "reader", mode: "insensitive" },
    });

    expect(where).toMatchObject({
      AND: [
        {
          email: { contains: "reader", mode: "insensitive" },
        },
        {
          NOT: expect.arrayContaining([
            expect.objectContaining({
              email: { contains: "@example.com", mode: "insensitive" },
            }),
          ]),
        },
      ],
    });
  });

  it("skips user exclusions when includeTestData is enabled", () => {
    const where = buildAdminVisibleUserWhere(
      { email: { contains: "reader", mode: "insensitive" } },
      true,
    );

    expect(where).toEqual({
      email: { contains: "reader", mode: "insensitive" },
    });
  });

  it("adds non-test exclusions to support, comments, and orders", () => {
    expect(buildAdminVisibleSupportTicketWhere()).toMatchObject({
      NOT: expect.arrayContaining([
        expect.objectContaining({
          replyEmail: { contains: "@example.com", mode: "insensitive" },
        }),
        expect.objectContaining({
          message: { contains: "playwright", mode: "insensitive" },
        }),
      ]),
    });

    expect(buildAdminVisibleCommentWhere()).toMatchObject({
      NOT: expect.arrayContaining([
        expect.objectContaining({
          content: { contains: "playwright", mode: "insensitive" },
        }),
        expect.objectContaining({
          user: {
            is: {
              email: { contains: "@example.com", mode: "insensitive" },
            },
          },
        }),
      ]),
    });

    expect(buildAdminVisibleOrderWhere()).toMatchObject({
      NOT: expect.arrayContaining([
        expect.objectContaining({
          user: {
            is: {
              email: { contains: "@example.com", mode: "insensitive" },
            },
          },
        }),
      ]),
    });
  });
});
