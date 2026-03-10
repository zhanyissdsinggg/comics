import { decryptString } from "../../common/utils/crypto";

export type EmailConfigProvider = "console" | "webhook" | "resend" | "sendgrid";
export const EMAIL_SECRET_PLACEHOLDER = "********";

export interface EmailConfigPayload {
  provider: EmailConfigProvider | string;
  from: string;
  webhookUrl: string;
  resendApiKey: string;
  sendgridApiKey: string;
  smsWebhookUrl: string;
  adminNotifyEmail: string;
  testRecipient: string;
  updatedAt: string | null;
}

export interface EmailAddressPayload {
  to?: string;
}

export interface OutboundEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailConfigInput = Partial<EmailConfigPayload>;

export const DEFAULT_EMAIL_CONFIG: EmailConfigPayload = {
  provider: "console",
  from: "",
  webhookUrl: "",
  resendApiKey: "",
  sendgridApiKey: "",
  smsWebhookUrl: "",
  adminNotifyEmail: "",
  testRecipient: "",
  updatedAt: null,
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) {
      return {};
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return isObjectLike(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return isObjectLike(value) ? value : {};
}

function normalizeProvider(value: unknown): EmailConfigProvider | string {
  return readString(value) || DEFAULT_EMAIL_CONFIG.provider;
}

function decryptSecret(value: string): string {
  if (!value) {
    return "";
  }

  try {
    return decryptString(value);
  } catch {
    return value;
  }
}

export function normalizeEmailConfig(input: EmailConfigInput | null | undefined): EmailConfigPayload {
  const source = input || {};

  return {
    provider: normalizeProvider(source.provider),
    from: readString(source.from),
    webhookUrl: readString(source.webhookUrl),
    resendApiKey: readString(source.resendApiKey),
    sendgridApiKey: readString(source.sendgridApiKey),
    smsWebhookUrl: readString(source.smsWebhookUrl),
    adminNotifyEmail: readString(source.adminNotifyEmail),
    testRecipient: readString(source.testRecipient),
    updatedAt: readString(source.updatedAt) || null,
  };
}

export function parseEmailConfigPayload(input: unknown): EmailConfigPayload {
  return normalizeEmailConfig(toObject(input));
}

export function maskEmailConfigSecrets(config: EmailConfigPayload): EmailConfigPayload {
  return {
    ...config,
    resendApiKey: config.resendApiKey ? EMAIL_SECRET_PLACEHOLDER : "",
    sendgridApiKey: config.sendgridApiKey ? EMAIL_SECRET_PLACEHOLDER : "",
    smsWebhookUrl: config.smsWebhookUrl ? EMAIL_SECRET_PLACEHOLDER : "",
  };
}

export function decryptEmailConfigSecrets(config: EmailConfigPayload): EmailConfigPayload {
  return {
    ...config,
    resendApiKey: decryptSecret(config.resendApiKey),
    sendgridApiKey: decryptSecret(config.sendgridApiKey),
    smsWebhookUrl: decryptSecret(config.smsWebhookUrl),
  };
}

export function isMaskedSecret(value: string): boolean {
  return value.includes("*") || value.includes("?");
}

export function isOutboundEmailPayload(value: unknown): value is OutboundEmailPayload {
  return (
    isObjectLike(value) &&
    typeof value.from === "string" &&
    typeof value.to === "string" &&
    typeof value.subject === "string" &&
    typeof value.html === "string" &&
    typeof value.text === "string"
  );
}
