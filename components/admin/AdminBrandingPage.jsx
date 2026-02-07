"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useBrandingStore } from "../../store/useBrandingStore";

const defaultDraft = {
  siteLogoUrl: "",
  faviconUrl: "",
  homeBannerUrl: "",
};

export default function AdminBrandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const { setBranding } = useBrandingStore();
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
    const response = await apiGet(`/api/admin/branding`);
    if (response.ok && response.data?.branding) {
      const payload = response.data.branding || {};
      setDraft({
        siteLogoUrl: payload.siteLogoUrl || "",
        faviconUrl: payload.faviconUrl || "",
        homeBannerUrl: payload.homeBannerUrl || "",
      });
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
    const response = await apiPost("/api/admin/branding", payload);
    if (response.ok && response.data?.branding) {
      setBranding(response.data.branding);
      setStatus("已保存");
    } else {
      setStatus("保存失败");
    }
  };

  return (
    <AdminShell
      title="图片管理"
      subtitle="更新网站 Logo、浏览器图标与首页 Banner"
      actions={
        isAuthenticated ? (
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
          >
            保存配置
          </button>
        ) : null
      }
    >
      {!isAuthenticated ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          403 无权限，请在地址栏附加 ?key=ADMIN_KEY
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-slate-400">
          加载中...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-800">站点 Logo</h3>
              <p className="mt-1 text-xs text-slate-400">用于页头 Logo</p>
              <input
                value={draft.siteLogoUrl}
                onChange={(event) => handleChange("siteLogoUrl", event.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://.../logo.png"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-800">预览</h3>
              <div className="mt-4 flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                {draft.siteLogoUrl ? (
                  <img src={draft.siteLogoUrl} alt="Site logo" className="h-10 w-auto" />
                ) : (
                  <span className="text-xs text-slate-400">暂无 Logo</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-800">浏览器图标 (favicon)</h3>
              <p className="mt-1 text-xs text-slate-400">用于浏览器标签栏</p>
              <input
                value={draft.faviconUrl}
                onChange={(event) => handleChange("faviconUrl", event.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://.../favicon.png"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-800">预览</h3>
              <div className="mt-4 flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                {draft.faviconUrl ? (
                  <img src={draft.faviconUrl} alt="Favicon" className="h-10 w-10" />
                ) : (
                  <span className="text-xs text-slate-400">暂无 favicon</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-800">首页 Banner 图</h3>
              <p className="mt-1 text-xs text-slate-400">用于首页 Hero 轮播首张</p>
              <input
                value={draft.homeBannerUrl}
                onChange={(event) => handleChange("homeBannerUrl", event.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://.../banner.jpg"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-800">预览</h3>
              <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50">
                {draft.homeBannerUrl ? (
                  <img
                    src={draft.homeBannerUrl}
                    alt="Banner"
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs text-slate-400">
                    暂无 Banner
                  </div>
                )}
              </div>
            </div>
          </div>

          {status ? <div className="text-sm text-emerald-600">{status}</div> : null}
        </div>
      )}
    </AdminShell>
  );
}
