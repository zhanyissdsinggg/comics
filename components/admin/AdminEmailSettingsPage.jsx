"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
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

export default function AdminEmailSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [draft, setDraft] = useState(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  // 老王说：检查认证状态，未登录则重定向
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/email`);
    if (response.ok && response.data?.config) {
      setDraft({ ...defaultDraft, ...response.data.config });
    }
    setLoading(false);
  }, []);

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

  const handleSave = async () => {
    setStatus("");
    const payload = { ...draft };
    const response = await apiPost("/api/admin/email", payload);
    if (response.ok) {
      setStatus("已保存");
    } else {
      setStatus(response.error || "保存失败");
    }
  };

  const handleClearKey = async (field) => {
    setStatus("");
    const payload = { ...draft, [field]: "" };
    const response = await apiPost("/api/admin/email", payload);
    if (response.ok) {
      setDraft((prev) => ({ ...prev, [field]: "" }));
      setStatus("已清空密钥");
    } else {
      setStatus(response.error || "清空失败");
    }
  };

  const handleTest = async () => {
    setStatus("");
    const response = await apiPost("/api/admin/email/test", {
      key,
      to: draft.testRecipient,
    });
    if (response.ok) {
      setStatus("测试邮件已发送");
    } else {
      setStatus(response.error || "测试发送失败");
    }
  };

  return (
    <AdminShell
      title="邮件设置"
      subtitle="配置邮件服务商与发件信息"
      actions={
        isAuthorized ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            >
              发送测试
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            >
              保存配置
            </button>
          </div>
        ) : null
      }
    >
      {!isAuthorized ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          403 无权限，请在地址栏附加 ?key=ADMIN_KEY
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-slate-400">
          加载中...
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
              <label className="text-xs uppercase text-slate-400">管理员告警邮箱</label>
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
                  清空
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
                  清空
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
                  清空
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
