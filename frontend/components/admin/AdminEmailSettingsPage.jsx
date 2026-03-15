"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

function normalizeDraft(config) {
  return { ...defaultDraft, ...(config || {}) };
}

function serializeDraft(config) {
  return JSON.stringify(normalizeDraft(config));
}

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
  const [savedDraft, setSavedDraft] = useState(defaultDraft);
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
    const nextDraft = normalizeDraft(config);
    setDraft(nextDraft);
    setSavedDraft(nextDraft);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const response = await adminGet("/api/admin/email");
    if (response.ok && response.data?.config) {
      applyConfig(response.data.config);
      setStatus({ type: "idle", message: "" });
    } else if (!response.ok) {
      setStatus({ type: "error", message: response.error || response.message || "邮件设置加载失败。" });
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
      setStatus({ type: "idle", message: "" });

      const response = await adminPost("/api/admin/email", payload);
      if (response.ok && response.data?.config) {
        applyConfig(response.data.config);
        setStatus({ type: "success", message: successMessage });
      } else if (response.ok) {
        const nextDraft = normalizeDraft(payload);
        setDraft(nextDraft);
        setSavedDraft(nextDraft);
        setStatus({ type: "success", message: successMessage });
      } else {
        setStatus({ type: "error", message: response.error || response.message || "修改保存失败。" });
      }

      setSaving(false);
      return response;
    },
    [applyConfig],
  );

  const handleSave = async () => {
    await persist(draft, "邮件设置已保存。");
  };

  const handleClearSecret = async (field) => {
    await persist({ ...draft, [field]: "" }, "密钥已清空。");
  };

  const hasUnsavedChanges = useMemo(() => serializeDraft(draft) !== serializeDraft(savedDraft), [draft, savedDraft]);

  const handleTest = async () => {
    const recipient = String(draft.testRecipient || "").trim();
    if (!recipient) {
      return;
    }

    setTesting(true);
    setStatus({ type: "idle", message: "" });

    let savedBeforeTest = false;
    if (hasUnsavedChanges) {
      const saveResponse = await persist(draft, "邮件设置已保存。");
      if (!saveResponse.ok) {
        setTesting(false);
        return;
      }
      savedBeforeTest = true;
    }

    const response = await adminPost("/api/admin/email/test", { to: recipient });
    if (response.ok) {
      setStatus({
        type: "success",
        message: savedBeforeTest
          ? "邮件设置已保存，并已发送测试邮件。"
          : "测试邮件已发送。",
      });
    } else {
      setStatus({ type: "error", message: response.error || response.message || "测试邮件发送失败。" });
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

  const testButtonLabel = testing
    ? hasUnsavedChanges
      ? "保存并发送中..."
      : "发送中..."
    : hasUnsavedChanges
      ? "保存并发送测试"
      : "发送测试";

  const secretFields = [
    {
      key: "resendApiKey",
      label: "Resend API 密钥",
      placeholder: "re_...",
    },
    {
      key: "sendgridApiKey",
      label: "SendGrid API 密钥",
      placeholder: "SG...",
    },
    {
      key: "smsWebhookUrl",
      label: "短信 Webhook 地址",
      placeholder: "https://sms.example.com/webhook",
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        需要先以管理员身份登录，才能管理邮件投递。
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
        正在加载邮件设置...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">邮件设置</h1>
          <p className="mt-2 text-sm text-slate-500">
            配置邮件投递服务商、发件人身份，以及系统邮件流程依赖的密钥信息。
          </p>
          {hasUnsavedChanges ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
              尚未保存的修改
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || saving || !draft.testRecipient}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testButtonLabel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存设置"}
          </button>
        </div>
      </div>

      {status.message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${statusClassName}`}>
          {status.message}
        </div>
      ) : null}

      <Section
        title="投递服务"
        description="选择事务邮件使用的投递服务商与发件人身份。"
      >
        <Field label="服务商">
          <select
            value={draft.provider}
            onChange={(event) => handleChange("provider", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
          >
            <option value="console">控制台（Console）</option>
            <option value="webhook">自定义 Webhook</option>
            <option value="resend">Resend（邮件服务）</option>
            <option value="sendgrid">SendGrid（邮件服务）</option>
          </select>
        </Field>
        <Field label="发件地址" hint="例如：no-reply@yourdomain.com">
          <input
            value={draft.from}
            onChange={(event) => handleChange("from", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="no-reply@yourdomain.com"
          />
        </Field>
        <Field label="管理员告警邮箱" hint="运营告警和错误摘要会发送到这里。">
          <input
            value={draft.adminNotifyEmail}
            onChange={(event) => handleChange("adminNotifyEmail", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="alerts@yourdomain.com"
          />
        </Field>
      </Section>

      <Section
        title="接口与密钥"
        description="Webhook 地址和服务商密钥在保存后会保持脱敏显示。"
      >
        <Field label="默认 Webhook 地址" hint="当服务商选择 Webhook 时使用。">
          <input
            value={draft.webhookUrl}
            onChange={(event) => handleChange("webhookUrl", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="https://provider.example.com/webhook"
          />
        </Field>

        {secretFields.map((field) => (
          <Field
            key={field.key}
            label={field.label}
            hint="如果要保留当前密钥，请保持脱敏值不变。"
          >
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
                清空
              </button>
            </div>
          </Field>
        ))}
      </Section>

      <Section
        title="验证"
        description="发送测试邮件，确认当前服务商和发件配置是否可用。"
      >
        <Field label="测试收件人">
          <input
            value={draft.testRecipient}
            onChange={(event) => handleChange("testRecipient", event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            placeholder="you@example.com"
          />
        </Field>
        <p className="text-xs text-slate-500">
          {hasUnsavedChanges
            ? "发送测试邮件前会先保存当前最新草稿。"
            : "测试邮件将使用当前已保存的投递配置。"}
        </p>
      </Section>
    </div>
  );
}
