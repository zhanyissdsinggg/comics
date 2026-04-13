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
        message: savedBeforeTest
          ? "邮件配置已保存，并已发送测试邮件。"
          : "测试邮件已发送。",
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
      <AdminPageSection title="邮件投递" description="需要管理员权限后，才能编辑邮件发送配置。">
        <p className="text-sm text-slate-500">请先以管理员身份登录，再管理发件人与投递配置。</p>
      </AdminPageSection>
    );
  }

  if (loading) {
    return (
      <AdminPageSection title="邮件投递" description="正在加载已保存的发件人与投递通道配置。">
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
        title="基础投递设置"
        description="在这里设置投递通道、默认发件地址，以及后台使用的内部告警邮箱。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {hasUnsavedChanges ? <AdminBadge tone="warning">有未保存更改</AdminBadge> : null}
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing || saving || !draft.testRecipient}
            >
              {testButtonLabel}
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !hasUnsavedChanges}>
              {saving ? "保存中..." : "保存设置"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <AdminFormField label="投递通道" helperText="选择后台运营邮件当前使用的发送方式。">
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

          <AdminFormField label="默认发件地址" helperText="读者最终会看到这个发件地址。">
            <input
              value={draft.from}
              onChange={(event) => handleChange("from", event.target.value)}
              className={adminInputClassName}
              placeholder="notice@yoursite.com"
            />
          </AdminFormField>

          <AdminFormField label="后台告警邮箱" helperText="投递异常和运营提醒都会发到这里。">
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
        title="通道密钥"
        description="把敏感密钥和内容工作流分开，但仍保持在邮件异常时能快速复核。"
      >
        <div className="space-y-4">
          <AdminFormField label="默认回调地址" helperText="当当前启用的是回调通道时，会使用这里的地址。">
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
                  helperText="如果要继续沿用当前密钥，保留已有遮罩值即可。"
                >
                  <input
                    value={draft[field.key]}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    className={adminInputClassName}
                    placeholder={field.placeholder}
                  />
                </AdminFormField>

                <div className="mt-3 flex justify-end rounded-[20px] border border-[color:var(--gush-border)] bg-white p-2 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
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
        description="直接用当前草稿发一封真实测试邮件，方便运营确认投递是否正常。"
      >
        <div className="grid gap-4">
          <AdminFormField
            label="测试收件人"
            helperText={
              hasUnsavedChanges
                ? "发送前会先保存当前草稿，再发测试邮件。"
                : "下一封测试邮件会直接使用当前已保存配置。"
            }
          >
            <input
              value={draft.testRecipient}
              onChange={(event) => handleChange("testRecipient", event.target.value)}
              className={adminInputClassName}
              placeholder="qa@yoursite.com"
            />
          </AdminFormField>
          <p className="text-sm leading-6 text-slate-500">
            收件人准备好后，直接用上方操作区发送测试邮件。
          </p>
        </div>
      </AdminPageSection>
    </div>
  );
}
