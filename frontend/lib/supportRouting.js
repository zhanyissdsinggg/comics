const SUPPORT_TOPIC_MAP = {
  billing: {
    id: "billing",
    label: "Billing issue",
    title: "Billing & points",
    subject: "Billing issue",
    description: "Wrong charge, missing points, duplicate payment, receipt problems, or taxes that look off.",
    draft:
      "Tell us what happened, what you expected to see, and whether the issue involves a point pack, renewal, or one-time charge.",
  },
  refund: {
    id: "refund",
    label: "Refund request",
    title: "Refund request",
    subject: "Refund request",
    description: "A charge you want reviewed for refund eligibility, especially if it looks incorrect or unused.",
    draft:
      "Tell us which purchase you want reviewed, why you believe it should be refunded, and whether any points or access from it were already used.",
  },
  account: {
    id: "account",
    label: "Sign-in help",
    title: "Account & sign-in",
    subject: "Sign-in help",
    description: "Email verification, password reset, Google sign-in, account recovery, or device/account sync confusion.",
    draft:
      "Tell us what part of sign-in or account access is failing, what you already tried, and which email or sign-in method should be attached to the account.",
  },
  reader: {
    id: "reader",
    label: "Reader issue",
    title: "Reader & chapter issue",
    subject: "Reader issue",
    description: "Broken reader pages, missing chapters, progress problems, locked access that looks wrong, or loading failures.",
    draft:
      "Tell us which title or chapter broke, what device or browser you used, and what happened when you tried to open or continue reading.",
  },
  adult: {
    id: "adult",
    label: "Age-check help",
    title: "Mature content access",
    subject: "Mature content access",
    description: "18+ access, age check failures, hidden mature titles, region mismatch, or Hide 18+ history questions.",
    draft:
      "Tell us whether the problem is age check, region settings, hidden titles, or 18+ history, and whether you are signed in on the affected account.",
  },
  content: {
    id: "content",
    label: "Content report",
    title: "Content report",
    subject: "Content report",
    description: "Cover issues, translation quality, metadata mistakes, title reports, or creator-credit problems.",
    draft:
      "Tell us which title or creator page needs review, what looks wrong, and any page URL that helps us find it faster.",
  },
};

export const SUPPORT_TOPICS = Object.values(SUPPORT_TOPIC_MAP);

export function getSupportTopicPreset(topic) {
  const key = String(topic || "").trim().toLowerCase();
  return SUPPORT_TOPIC_MAP[key] || null;
}

export function buildSupportPath({
  topic = "",
  orderId = "",
  subject = "",
  message = "",
  context = "",
} = {}) {
  const params = new URLSearchParams();
  const preset = getSupportTopicPreset(topic);

  if (preset?.id) {
    params.set("topic", preset.id);
  }

  if (orderId) {
    params.set("orderId", String(orderId));
  }

  const subjectValue = String(subject || preset?.subject || "").trim();
  if (subjectValue) {
    params.set("subject", subjectValue);
  }

  const messageValue = String(message || "").trim();
  if (messageValue) {
    params.set("message", messageValue);
  }

  const contextValue = String(context || "").trim();
  if (contextValue) {
    params.set("context", contextValue);
  }

  const query = params.toString();
  return query ? `/support?${query}` : "/support";
}
