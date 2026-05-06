const SUPPORT_TOPIC_MAP = {
  billing: {
    id: "billing",
    label: "Billing & purchases",
    title: "Billing & purchases",
    subject: "Billing issue",
    description: "Wrong charge, missing purchase, duplicate payment, refund issue, or receipt problem.",
    draft: "What happened? Add the charge or order details.",
  },
  login: {
    id: "login",
    label: "Login & account",
    title: "Login & account",
    subject: "Login help",
    description: "Email verification, password reset, sign-in trouble, account recovery, or sync issues.",
    draft: "What part of sign-in is not working?",
  },
  technical: {
    id: "technical",
    label: "Reader issue",
    title: "Reader issue",
    subject: "Reader issue",
    description: "Broken reader pages, missing chapters, progress problems, playback failures, or pages that will not load.",
    draft: "Which title or chapter broke?",
  },
  adult: {
    id: "adult",
    label: "Mature access",
    title: "Mature content access",
    subject: "Mature content access",
    description: "18+ access, age check failures, hidden mature titles, region mismatch, or Hide 18+ history questions.",
    draft: "Is this about age check, region, hidden titles, or 18+ history?",
  },
  content: {
    id: "content",
    label: "Content issue",
    title: "Content report",
    subject: "Content report",
    description: "Cover issues, translation quality, metadata mistakes, title reports, or creator-credit problems.",
    draft: "Which title or creator page needs review?",
  },
  other: {
    id: "other",
    label: "Other",
    title: "Other",
    subject: "Support request",
    description: "Anything else that does not fit the other support categories.",
    draft: "Tell us what you need help with.",
  },
};

export const SUPPORT_TOPICS = Object.values(SUPPORT_TOPIC_MAP);

export const SUPPORT_PRIMARY_TOPICS = [
  SUPPORT_TOPIC_MAP.billing,
  SUPPORT_TOPIC_MAP.login,
  SUPPORT_TOPIC_MAP.technical,
  SUPPORT_TOPIC_MAP.adult,
  SUPPORT_TOPIC_MAP.content,
  SUPPORT_TOPIC_MAP.other,
];

const SUPPORT_TOPIC_ALIASES = {
  account: "login",
  reader: "technical",
  refund: "billing",
  signin: "login",
  "sign-in": "login",
};

export function getSupportTopicPreset(topic) {
  const rawKey = String(topic || "").trim().toLowerCase();
  const key = SUPPORT_TOPIC_ALIASES[rawKey] || rawKey;
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
