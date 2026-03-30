"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AdminFeedbackBanner } from "@/components/admin/common/AdminFeedbackBanner";
import {
  AdminBadge,
  AdminFormField,
  AdminPageSection,
  adminInputClassName,
  adminSelectClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { useAdminAuth } from "./AuthContext";
import { adminGet, adminPost } from "../../lib/adminApiClient";

const defaultDraft = {
  provider: "console",
  from: "",
  webhookUrl: "",
  resendApiKey: "",
  sendgridApiKey: "",
  smsWebhookUrl: "",
  adminNotifyEmail: "",
  testRecipient: "",
};

const providerOptions = [
  { value: "console", label: "Console" },
  { value: "webhook", label: "Webhook" },
  { value: "resend", label: "Resend" },
  { value: "sendgrid", label: "SendGrid" },
];

const secretFields = [
  {
    key: "resendApiKey",
    label: "Resend API key",
    placeholder: "re_...",
  },
  {
    key: "sendgridApiKey",
    label: "SendGrid API key",
    placeholder: "SG...",
  },
  {
    key: "smsWebhookUrl",
    label: "SMS webhook URL",
    placeholder: "https://sms.example.com/webhook",
  },
];

function normalizeDraft(config) {
  return { ...defaultDraft, ...(config || {}) };
}

function serializeDraft(config) {
  return JSON.stringify(normalizeDraft(config));
}

export default function AdminEmailSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  const [draft, setDraft] = useState(defaultDraft);
  const [savedDraft, setSavedDraft] = useState(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const applyConfig = useCallback((config) => {
    const nextDraft = normalizeDraft(config);
    setDraft(nextDraft);
    setSavedDraft(nextDraft);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const response = await adminGet("/api/admin/email");
    if (response.ok && response.data?.config) {
      applyConfig(response.data.config);
      setFeedback({ type: "", message: "" });
    } else if (!response.ok) {
      setFeedback({
        type: "error",
        message: response.error || response.message || "Email settings could not be loaded.",
      });
    }
    setLoading(false);
  }, [applyConfig]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, isLoading, loadData]);

  const handleChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const persist = useCallback(
    async (payload, successMessage) => {
      setSaving(true);
      setFeedback({ type: "", message: "" });

      const response = await adminPost("/api/admin/email", payload);
      if (response.ok && response.data?.config) {
        applyConfig(response.data.config);
        setFeedback({ type: "success", message: successMessage });
      } else if (response.ok) {
        const nextDraft = normalizeDraft(payload);
        setDraft(nextDraft);
        setSavedDraft(nextDraft);
        setFeedback({ type: "success", message: successMessage });
      } else {
        setFeedback({
          type: "error",
          message: response.error || response.message || "Email settings could not be saved.",
        });
      }

      setSaving(false);
      return response;
    },
    [applyConfig],
  );

  const handleSave = async () => {
    await persist(draft, "Email settings saved.");
  };

  const handleClearSecret = async (field) => {
    await persist({ ...draft, [field]: "" }, "Secret cleared.");
  };

  const hasUnsavedChanges = useMemo(
    () => serializeDraft(draft) !== serializeDraft(savedDraft),
    [draft, savedDraft],
  );

  const handleTest = async () => {
    const recipient = String(draft.testRecipient || "").trim();
    if (!recipient) {
      return;
    }

    setTesting(true);
    setFeedback({ type: "", message: "" });

    let savedBeforeTest = false;
    if (hasUnsavedChanges) {
      const saveResponse = await persist(draft, "Email settings saved.");
      if (!saveResponse.ok) {
        setTesting(false);
        return;
      }
      savedBeforeTest = true;
    }

    const response = await adminPost("/api/admin/email/test", { to: recipient });
    if (response.ok) {
      setFeedback({
        type: "success",
        message: savedBeforeTest
          ? "Email settings saved, then the test email was sent."
          : "Test email sent.",
      });
    } else {
      setFeedback({
        type: "error",
        message: response.error || response.message || "The test email could not be sent.",
      });
    }

    setTesting(false);
  };

  const testButtonLabel = testing
    ? hasUnsavedChanges
      ? "Saving and sending..."
      : "Sending..."
    : hasUnsavedChanges
      ? "Save and send test"
      : "Send test";

  if (!isAuthenticated) {
    return (
      <AdminPageSection title="Email delivery" description="Admin access is required before delivery settings can be edited.">
        <p className="text-sm text-slate-500">Sign in as an admin to manage sender and delivery settings.</p>
      </AdminPageSection>
    );
  }

  if (loading) {
    return (
      <AdminPageSection title="Email delivery" description="Loading the saved sender and provider configuration.">
        <p className="text-sm text-slate-500">Loading email settings...</p>
      </AdminPageSection>
    );
  }

  return (
    <div className="space-y-6">
      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback({ type: "", message: "" })}
      />

      <AdminPageSection
        title="Delivery defaults"
        description="Set the provider, sender address, and internal alert inbox the rest of the admin workspace depends on."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {hasUnsavedChanges ? <AdminBadge tone="warning">Unsaved changes</AdminBadge> : null}
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || saving || !draft.testRecipient}
            >
              {testButtonLabel}
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminFormField label="Provider" helperText="Choose the delivery path used for operational email.">
            <select
              value={draft.provider}
              onChange={(event) => handleChange("provider", event.target.value)}
              className={adminSelectClassName}
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </AdminFormField>

          <AdminFormField label="From address" helperText="The default sender readers will see.">
            <input
              value={draft.from}
              onChange={(event) => handleChange("from", event.target.value)}
              className={adminInputClassName}
              placeholder="no-reply@yourdomain.com"
            />
          </AdminFormField>

          <AdminFormField label="Admin alert inbox" helperText="Operational notices and delivery problems are routed here.">
            <input
              value={draft.adminNotifyEmail}
              onChange={(event) => handleChange("adminNotifyEmail", event.target.value)}
              className={adminInputClassName}
              placeholder="alerts@yourdomain.com"
            />
          </AdminFormField>
        </div>
      </AdminPageSection>

      <AdminPageSection
        title="Provider secrets"
        description="Keep sensitive provider credentials separate from the main content workflow, but still easy to review when email behavior changes."
      >
        <div className="space-y-4">
          <AdminFormField label="Default webhook URL" helperText="Used when webhook delivery is the active provider path.">
            <input
              value={draft.webhookUrl}
              onChange={(event) => handleChange("webhookUrl", event.target.value)}
              className={adminInputClassName}
              placeholder="https://provider.example.com/webhook"
            />
          </AdminFormField>

          <div className="grid gap-4 xl:grid-cols-3">
            {secretFields.map((field) => (
              <div
                key={field.key}
                className="rounded-[24px] border border-black/8 bg-white/86 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
              >
                <AdminFormField
                  label={field.label}
                  helperText="Keep masked values in place if the existing secret should remain active."
                >
                  <input
                    value={draft[field.key]}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    className={adminInputClassName}
                    placeholder={field.placeholder}
                  />
                </AdminFormField>

                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleClearSecret(field.key)}
                    disabled={saving || testing}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminPageSection>

      <AdminPageSection
        title="Test email"
        description="Send a real test message from the current draft so operators can verify delivery without digging through provider dashboards."
      >
        <div className="grid gap-4">
          <AdminFormField
            label="Test recipient"
            helperText={
              hasUnsavedChanges
                ? "The latest draft will be saved before the test email is sent."
                : "The saved configuration will be used for the next test email."
            }
          >
            <input
              value={draft.testRecipient}
              onChange={(event) => handleChange("testRecipient", event.target.value)}
              className={adminInputClassName}
              placeholder="you@example.com"
            />
          </AdminFormField>
          <p className="text-sm leading-6 text-slate-500">
            Use the action row above to send the test message once the recipient is ready.
          </p>
        </div>
      </AdminPageSection>
    </div>
  );
}
