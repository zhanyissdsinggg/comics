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
  { value: "console", label: "控制台" },
  { value: "webhook", label: "回调地址" },
  { value: "resend", label: "Resend 邮件服务" },
  { value: "sendgrid", label: "SendGrid 邮件服务" },
];

const secretFields = [
  {
    key: "resendApiKey",
    label: "Resend 密钥",
    placeholder: "re_...",
  },
  {
    key: "sendgridApiKey",
    label: "SendGrid 密钥",
    placeholder: "SG...",
  },
  {
    key: "smsWebhookUrl",
    label: "短信回调地址",
    placeholder: "https://notify.yoursite.com/sms/webhook",
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
        message: response.error || response.message || "邮件配置加载失败。",
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
          message: response.error || response.message || "邮件配置保存失败。",
        });
      }

      setSaving(false);
      return response;
    },
    [applyConfig],
  );

  const handleSave = async () => {
    await persist(draft, "邮件配置已保存。");
  };

  const handleClearSecret = async (field) => {
    await persist({ ...draft, [field]: "" }, "密钥已清空。");
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
      const saveResponse = await persist(draft, "邮件配置已保存。");
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
        message: savedBeforeTest ? "配置已保存，并已发出测试邮件。" : "测试邮件已发出。",
      });
    } else {
      setFeedback({
        type: "error",
        message: response.error || response.message || "测试邮件发送失败。",
      });
    }

    setTesting(false);
  };

  const testButtonLabel = testing
    ? hasUnsavedChanges
      ? "保存并发送中..."
      : "发送中..."
    : hasUnsavedChanges
      ? "保存并发送测试"
      : "发送测试";

  if (!isAuthenticated) {
    return (
      <AdminPageSection title="邮件投递" description="需要管理员权限后，才能编辑邮件配置。">
        <p className="text-sm text-slate-500">请先登录后台，再管理发信配置。</p>
      </AdminPageSection>
    );
  }

  if (loading) {
    return (
      <AdminPageSection title="邮件投递" description="正在读取已保存的发信配置。">
        <p className="text-sm text-slate-500">正在加载邮件配置...</p>
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
        title="发信通道"
        description="先定通道、发件地址和通知邮箱。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {hasUnsavedChanges ? <AdminBadge tone="warning">有未保存更改</AdminBadge> : null}
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || saving || !draft.testRecipient}
              data-testid="admin-email-send-test"
            >
              {testButtonLabel}
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !hasUnsavedChanges} data-testid="admin-email-save-settings">
              {saving ? "保存中..." : "保存设置"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminFormField label="投递通道" helperText="选择当前使用的发信方式。">
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

          <AdminFormField label="默认发件地址" helperText="读者会看到这个发件地址。">
            <input
              value={draft.from}
              onChange={(event) => handleChange("from", event.target.value)}
              className={adminInputClassName}
              placeholder="notice@yoursite.com"
              data-testid="admin-email-from-input"
            />
          </AdminFormField>

          <AdminFormField label="运营通知邮箱" helperText="投递异常和系统提醒会发到这里。">
            <input
              value={draft.adminNotifyEmail}
              onChange={(event) => handleChange("adminNotifyEmail", event.target.value)}
              className={adminInputClassName}
              placeholder="ops@yoursite.com"
            />
          </AdminFormField>
        </div>
      </AdminPageSection>

      <AdminPageSection
        title="密钥与回调"
        description="把密钥和回调集中放在一起。"
      >
        <div className="space-y-4">
          <AdminFormField label="默认回调地址" helperText="启用回调通道时会使用这里的地址。">
            <input
              value={draft.webhookUrl}
              onChange={(event) => handleChange("webhookUrl", event.target.value)}
              className={adminInputClassName}
              placeholder="https://notify.yoursite.com/email/webhook"
            />
          </AdminFormField>

          <div className="grid gap-4 xl:grid-cols-3">
            {secretFields.map((field) => (
              <div
                key={field.key}
                className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.035)] ring-1 ring-black/[0.02]"
              >
                <AdminFormField
                  label={field.label}
                  helperText="继续沿用当前值时，保持原样即可。"
                >
                  <input
                    value={draft[field.key]}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    className={adminInputClassName}
                    placeholder={field.placeholder}
                  />
                </AdminFormField>

                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleClearSecret(field.key)}
                    disabled={saving || testing}
                  >
                    清空
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminPageSection>

      <AdminPageSection
        title="测试邮件"
        description="用当前草稿发一封测试邮件。"
      >
        <div className="grid gap-4">
          <AdminFormField
            label="测试收件人"
            helperText={
              hasUnsavedChanges
                ? "发送前会先保存当前草稿。"
                : "会直接使用当前已保存的配置。"
            }
          >
            <input
              value={draft.testRecipient}
              onChange={(event) => handleChange("testRecipient", event.target.value)}
              className={adminInputClassName}
              placeholder="qa@yoursite.com"
              data-testid="admin-email-test-recipient"
            />
          </AdminFormField>
        </div>
      </AdminPageSection>
    </div>
  );
}
