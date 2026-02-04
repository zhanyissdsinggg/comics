"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiGet, apiPost } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

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

export default function AdminEmailSettingsPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const isAuthorized = key === ADMIN_KEY;
  const [draft, setDraft] = useState(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/email?key=${key}`);
    if (response.ok && response.data?.config) {
      setDraft({ ...defaultDraft, ...response.data.config });
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadData]);

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setStatus("");
    const payload = { key, ...draft };
    const response = await apiPost("/api/admin/email", payload);
    if (response.ok) {
      setStatus("ÒÑ±£´æ");
    } else {
      setStatus(response.error || "±£´æÊ§°Ü");
    }
  };

  const handleClearKey = async (field) => {
    setStatus("");
    const payload = { key, ...draft, [field]: "" };
    const response = await apiPost("/api/admin/email", payload);
    if (response.ok) {
      setDraft((prev) => ({ ...prev, [field]: "" }));
      setStatus("ÒÑÇå¿ÕÃÜÔ¿");
    } else {
      setStatus(response.error || "Çå¿ÕÊ§°Ü");
    }
  };

  const handleTest = async () => {
    setStatus("");
    const response = await apiPost("/api/admin/email/test", {
      key,
      to: draft.testRecipient,
    });
    if (response.ok) {
      setStatus("²âÊÔÓÊ¼þÒÑ·¢ËÍ");
    } else {
      setStatus(response.error || "²âÊÔ·¢ËÍÊ§°Ü");
    }
  };

  return (
    <AdminShell
      title="ÓÊ¼þÉèÖÃ"
      subtitle="ÅäÖÃÓÊ¼þ·þÎñÉÌÓë·¢¼þÐÅÏ¢"
      actions={
        isAuthorized ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            >
              ·¢ËÍ²âÊÔ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            >
              ±£´æÅäÖÃ
            </button>
          </div>
        ) : null
      }
    >
      {!isAuthorized ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          403 ÎÞÈ¨ÏÞ£¬ÇëÔÚµØÖ·À¸¸½¼Ó ?key=ADMIN_KEY
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-slate-400">
          ¼ÓÔØÖÐ...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <label className="text-xs uppercase text-slate-400">Provider</label>
              <select
                value={draft.provider}
                onChange={(event) => handleChange("provider", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="console">Console (dev)</option>
                <option value="webhook">Webhook</option>
                <option value="resend">Resend</option>
                <option value="sendgrid">SendGrid</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-400">From</label>
              <input
                value={draft.from}
                onChange={(event) => handleChange("from", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="no-reply@yourdomain.com"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-400">¹ÜÀíÔ±¸æ¾¯ÓÊÏä</label>
              <input
                value={draft.adminNotifyEmail}
                onChange={(event) => handleChange("adminNotifyEmail", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="admin@yourdomain.com"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <label className="text-xs uppercase text-slate-400">Webhook URL</label>
              <input
                value={draft.webhookUrl}
                onChange={(event) => handleChange("webhookUrl", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs uppercase text-slate-400">Resend API Key</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={draft.resendApiKey}
                  onChange={(event) => handleChange("resendApiKey", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="re_..."
                />
                <button
                  type="button"
                  onClick={() => handleClearKey("resendApiKey")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  Çå¿Õ
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase text-slate-400">SendGrid API Key</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={draft.sendgridApiKey}
                  onChange={(event) => handleChange("sendgridApiKey", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="SG..."
                />
                <button
                  type="button"
                  onClick={() => handleClearKey("sendgridApiKey")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  Çå¿Õ
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <label className="text-xs uppercase text-slate-400">SMS Webhook URL</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={draft.smsWebhookUrl}
                  onChange={(event) => handleChange("smsWebhookUrl", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => handleClearKey("smsWebhookUrl")}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  Çå¿Õ
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <div>
              <label className="text-xs uppercase text-slate-400">Test recipient</label>
              <input
                value={draft.testRecipient}
                onChange={(event) => handleChange("testRecipient", event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="you@example.com"
              />
            </div>
            {status ? <div className="text-xs text-emerald-600">{status}</div> : null}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
