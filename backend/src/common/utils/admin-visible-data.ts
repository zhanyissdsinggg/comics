import { Prisma } from "@prisma/client";

const TEST_EMAIL_PATTERNS = [
  "@example.com",
  "qa_",
  "gush.qa.",
  "smoke_",
  "deploy-verify-",
] as const;

const TEST_TEXT_PATTERNS = [
  "playwright",
  "smoke test",
  "smoke check",
  "deploy-verify",
  "deploy verify",
  "qa_",
] as const;

function containsInsensitive(pattern: string) {
  return {
    contains: pattern,
    mode: "insensitive" as const,
  };
}

function hasOwnKeys(value: object) {
  return Object.keys(value).length > 0;
}

function mergeWhere<T extends object>(baseWhere: T, visibilityWhere: T, includeTestData: boolean): T {
  if (includeTestData) {
    return baseWhere;
  }

  if (!hasOwnKeys(baseWhere)) {
    return visibilityWhere;
  }

  return {
    AND: [baseWhere, visibilityWhere],
  } as T;
}

function buildNonTestUserWhere(): Prisma.UserWhereInput {
  return {
    NOT: TEST_EMAIL_PATTERNS.map((pattern) => ({
      email: containsInsensitive(pattern),
    })),
  };
}

function buildNonTestSupportTicketWhere(): Prisma.SupportTicketWhereInput {
  return {
    NOT: [
      ...TEST_EMAIL_PATTERNS.map((pattern) => ({
        replyEmail: containsInsensitive(pattern),
      })),
      ...TEST_TEXT_PATTERNS.map((pattern) => ({
        subject: containsInsensitive(pattern),
      })),
      ...TEST_TEXT_PATTERNS.map((pattern) => ({
        message: containsInsensitive(pattern),
      })),
      ...TEST_TEXT_PATTERNS.map((pattern) => ({
        topic: containsInsensitive(pattern),
      })),
      ...TEST_EMAIL_PATTERNS.map((pattern) => ({
        user: {
          is: {
            email: containsInsensitive(pattern),
          },
        },
      })),
    ],
  };
}

function buildNonTestCommentWhere(): Prisma.CommentWhereInput {
  return {
    NOT: [
      ...TEST_TEXT_PATTERNS.map((pattern) => ({
        text: containsInsensitive(pattern),
      })),
      ...TEST_TEXT_PATTERNS.map((pattern) => ({
        content: containsInsensitive(pattern),
      })),
      ...TEST_EMAIL_PATTERNS.map((pattern) => ({
        user: {
          is: {
            email: containsInsensitive(pattern),
          },
        },
      })),
    ],
  };
}

function buildNonTestOrderWhere(): Prisma.OrderWhereInput {
  return {
    NOT: TEST_EMAIL_PATTERNS.map((pattern) => ({
      user: {
        is: {
          email: containsInsensitive(pattern),
        },
      },
    })),
  };
}

export function readIncludeTestDataFlag(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

export function buildAdminVisibleUserWhere(
  baseWhere: Prisma.UserWhereInput = {},
  includeTestData = false,
): Prisma.UserWhereInput {
  return mergeWhere(baseWhere, buildNonTestUserWhere(), includeTestData);
}

export function buildAdminVisibleSupportTicketWhere(
  baseWhere: Prisma.SupportTicketWhereInput = {},
  includeTestData = false,
): Prisma.SupportTicketWhereInput {
  return mergeWhere(baseWhere, buildNonTestSupportTicketWhere(), includeTestData);
}

export function buildAdminVisibleCommentWhere(
  baseWhere: Prisma.CommentWhereInput = {},
  includeTestData = false,
): Prisma.CommentWhereInput {
  return mergeWhere(baseWhere, buildNonTestCommentWhere(), includeTestData);
}

export function buildAdminVisibleOrderWhere(
  baseWhere: Prisma.OrderWhereInput = {},
  includeTestData = false,
): Prisma.OrderWhereInput {
  return mergeWhere(baseWhere, buildNonTestOrderWhere(), includeTestData);
}
