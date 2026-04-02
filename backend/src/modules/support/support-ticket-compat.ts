export const SUPPORT_TICKET_OPTIONAL_COLUMNS = ["replyEmail", "orderId", "topic"] as const;

export type SupportTicketOptionalColumn = (typeof SUPPORT_TICKET_OPTIONAL_COLUMNS)[number];

export function getMissingSupportTicketOptionalColumn(
  error: unknown,
): SupportTicketOptionalColumn | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    meta?: Record<string, unknown>;
  };
  const code = String(candidate.code || "").trim();
  const message = String(candidate.message || "").toLowerCase();
  const columnName = String(
    candidate.meta?.column || candidate.meta?.field_name || candidate.meta?.target || "",
  ).trim().toLowerCase();

  if (code !== "P2022" && !message.includes("does not exist")) {
    return null;
  }

  const haystack = `${columnName} ${message}`;
  if (haystack.includes("support_tickets.replyemail") || haystack.includes("replyemail")) {
    return "replyEmail";
  }
  if (haystack.includes("support_tickets.orderid") || haystack.includes("orderid")) {
    return "orderId";
  }
  if (haystack.includes("support_tickets.topic") || haystack.includes("topic")) {
    return "topic";
  }

  return null;
}
