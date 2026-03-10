"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import { apiGet, apiPost } from "../../lib/apiClient";

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

function Section({ title, description, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2">{children}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </label>
  );
}

export default function AdminEmailSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [draft, setDraft] = useState(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const applyConfig = useCallback((config) => {
    setDraft({ ...defaultDraft, ...(config || {}) });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const response = await apiGet("/api/admin/email");
    if (response.ok && response.data?.config) {
      applyConfig(response.data.config);
      setStatus({ type: "idle", message: "" });
    } else if (!response.ok) {
      setStatus({ type: "error", message: response.error || "Failed to load email settings." });
    }
    setLoading(false);
  }, [applyConfig]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadData]);

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const persist = useCallback(async (payload, successMessage) => {
    setSaving(true);
    setStatus({ type: "idle", message: "" });
    const response = await apiPost("/api/admin/email", payload);
    if (response.ok && response.data?.config) {
      applyConfig(response.data.config);
      setStatus({ type: "success", message: successMessage });
    } else if (response.ok) {
      setStatus({ type: "success", message: successMessage });
    } else {
      setStatus({ type: "error", message: response.error || "Save failed." });
    }
    setSaving(false);
    return response;
  }, [applyConfig]);

  const handleSave = async () => {
    await persist(draft, "Email settings saved.");
  };

  const handleClearSecret = async (field) => {
    const payload = { ...draft, [field]: "" };
    const response = await persist(payload, "Secret cleared.");
    if (response.ok) {
      await loadData();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setStatus({ type: "idle", message: "" });
    const response = await apiPost("/api/admin/email/test", {
      to: draft.testRecipient,
    });
    if (response.ok) {
      setStatus({ type: "success", message: "Test email sent." });
    } else {
      setStatus({ type: "error", message: response.error || "Unable to send test email." });
    }
    setTesting(false);
  };

  const statusClassName = useMemo(() => {
    if (status.type === "success") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status.type === "error") {
      return "border-red-200 bg-red-50 text-red-700";
    }
    return "border-slate-200 bg-slate-50 text-slate-600";
  }, [status.type]);

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

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        Sign in as an admin to manage email delivery.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
        Loading email settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Email Settings</h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure your delivery provider, sender identity, and masked secrets.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || saving || !draft.testRecipient}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? "Sending..." : "Send test"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </div>

      {status.message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${statusClassName}`}>
          {status.message}
        </div>
      ) : null}

      <Section
        title="Provider"
        description="Pick the outbound provider and sender identity used for admin-generated mail."
      >
        <Field label="Provider">
          <select
            value={draft.provider}
            onChange={(event) => handleChange("provider", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          >
            <option value="console">Console</option>
            <option value="webhook">Webhook</option>
            <option value="resend">Resend</option>
            <option value="sendgrid">SendGrid</option>
          </select>
        </Field>
        <Field label="From address" hint="Example: no-reply@yourdomain.com">
          <input
            value={draft.from}
            onChange={(event) => handleChange("from", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="no-reply@yourdomain.com"
          />
        </Field>
        <Field label="Admin alerts" hint="Operational notifications and error digests will go here.">
          <input
            value={draft.adminNotifyEmail}
            onChange={(event) => handleChange("adminNotifyEmail", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="alerts@yourdomain.com"
          />
        </Field>
      </Section>

      <Section
        title="Delivery Endpoints"
        description="Webhook providers and secret credentials are stored masked after save."
      >
        <Field label="General webhook URL" hint="Used when provider is set to Webhook.">
          <input
            value={draft.webhookUrl}
            onChange={(event) => handleChange("webhookUrl", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="https://provider.example.com/webhook"
          />
        </Field>

        {secretFields.map((field) => (
          <Field key={field.key} label={field.label} hint="Leave the masked value untouched to keep the current secret.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={draft[field.key]}
                onChange={(event) => handleChange(field.key, event.target.value)}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                placeholder={field.placeholder}
              />
              <button
                type="button"
                onClick={() => handleClearSecret(field.key)}
                disabled={saving || testing}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </Field>
        ))}
      </Section>

      <Section
        title="Validation"
        description="Use a disposable inbox or your own address to verify delivery after changes."
      >
        <Field label="Test recipient">
          <input
            value={draft.testRecipient}
            onChange={(event) => handleChange("testRecipient", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="you@example.com"
          />
        </Field>
      </Section>
    </div>
  );
}
