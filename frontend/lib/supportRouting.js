const SUPPORT_TOPIC_MAP = {
  billing: {
    id: "billing",
    label: "Billing",
    title: "Billing & receipts",
    subject: "Billing issue",
    description: "Wrong charge, missing points, duplicate payment, receipts, renewals, or taxes that look off.",
    draft:
      "Tell us what happened, what you expected to see, and whether the issue involves a point pack, renewal, or one-time charge.",
  },
  login: {
    id: "login",
    label: "Login",
    title: "Login & account access",
    subject: "Login help",
    description: "Email verification, password reset, sign-in trouble, account recovery, or sync issues.",
    draft:
      "Tell us what part of sign-in or account access is failing, what you already tried, and which email or sign-in method should be attached to the account.",
  },
  subscription: {
    id: "subscription",
    label: "Subscription",
    title: "Membership & subscription",
    subject: "Membership help",
    description: "Membership charges, plan changes, renewals, perks, or access that looks wrong.",
    draft:
      "Tell us which plan or renewal is involved, what you expected membership to include, and whether the issue is about billing, access, or cancellation timing.",
  },
  technical: {
    id: "technical",
    label: "Technical issue",
    title: "Technical & reader issue",
    subject: "Technical issue",
    description: "Broken reader pages, missing chapters, progress problems, playback failures, or pages that will not load.",
    draft:
      "Tell us which title or chapter broke, what device or browser you used, and what happened when you tried to open or continue reading.",
  },
  adult: {
    id: "adult",
    label: "Mature access",
    title: "Mature content access",
    subject: "Mature content access",
    description: "18+ access, age check failures, hidden mature titles, region mismatch, or Hide 18+ history questions.",
    draft:
      "Tell us whether the problem is age check, region settings, hidden titles, or 18+ history, and whether you are signed in on the affected account.",
  },
  content: {
    id: "content",
    label: "Content issue",
    title: "Content report",
    subject: "Content report",
    description: "Cover issues, translation quality, metadata mistakes, title reports, or creator-credit problems.",
    draft:
      "Tell us which title or creator page needs review, what looks wrong, and any page URL that helps us find it faster.",
  },
};

export const SUPPORT_TOPICS = Object.values(SUPPORT_TOPIC_MAP);

export const SUPPORT_PRIMARY_TOPICS = [
  SUPPORT_TOPIC_MAP.billing,
  SUPPORT_TOPIC_MAP.login,
  SUPPORT_TOPIC_MAP.subscription,
  SUPPORT_TOPIC_MAP.content,
  SUPPORT_TOPIC_MAP.technical,
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
