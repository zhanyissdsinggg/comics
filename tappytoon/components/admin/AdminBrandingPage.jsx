"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import AdminShell from "./AdminShell";
import { apiGet, apiPost, apiUpload } from "../../lib/apiClient";
import { useBrandingStore } from "../../store/useBrandingStore";
import { Image as ImageIcon } from "lucide-react";

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
  const [uploading, setUploading] = useState({ logo: false, favicon: false, banner: false });

  // 老王注释：文件输入框refs
  const logoFileRef = useRef(null);
  const faviconFileRef = useRef(null);
  const bannerFileRef = useRef(null);

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

  // 老王添加：通用图片上传处理函数
  const handleImageUpload = async (field, fileInputRef, uploadingKey) => {
    return async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      // 老王注释：检查文件类型
      if (!file.type.startsWith("image/")) {
        alert("❌ 请选择图片文件！");
        return;
      }

      // 老王注释：检查文件大小（10MB）
      if (file.size > 10 * 1024 * 1024) {
        alert("❌ 图片文件不能超过10MB！");
        return;
      }

      setUploading((prev) => ({ ...prev, [uploadingKey]: true }));
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await apiUpload("/api/admin/upload/image", formData);
        if (response.ok && response.data?.url) {
          setDraft((prev) => ({ ...prev, [field]: response.data.url }));
          setStatus(`✅ ${uploadingKey === 'logo' ? 'Logo' : uploadingKey === 'favicon' ? 'Favicon' : 'Banner'}上传成功！`);
        } else {
          alert("❌ 上传失败：" + (response.error || "未知错误"));
        }
      } catch (error) {
        alert("❌ 上传失败：网络错误");
      } finally {
        setUploading((prev) => ({ ...prev, [uploadingKey]: false }));
        // 老王注释：清空文件输入，允许重新上传同一文件
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
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
              <div className="mt-3 space-y-2">
                <input
                  value={draft.siteLogoUrl}
                  onChange={(event) => handleChange("siteLogoUrl", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="https://.../logo.png 或点击下方上传"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoFileRef.current?.click()}
                    disabled={uploading.logo}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    <ImageIcon className="h-3 w-3" />
                    {uploading.logo ? "上传中..." : "上传Logo"}
                  </button>
                  {draft.siteLogoUrl && (
                    <a
                      href={draft.siteLogoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      预览 →
                    </a>
                  )}
                </div>
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload("siteLogoUrl", logoFileRef, "logo")}
                  className="hidden"
                />
              </div>
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
              <div className="mt-3 space-y-2">
                <input
                  value={draft.faviconUrl}
                  onChange={(event) => handleChange("faviconUrl", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="https://.../favicon.png 或点击下方上传"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => faviconFileRef.current?.click()}
                    disabled={uploading.favicon}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    <ImageIcon className="h-3 w-3" />
                    {uploading.favicon ? "上传中..." : "上传Favicon"}
                  </button>
                  {draft.faviconUrl && (
                    <a
                      href={draft.faviconUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      预览 →
                    </a>
                  )}
                </div>
                <input
                  ref={faviconFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload("faviconUrl", faviconFileRef, "favicon")}
                  className="hidden"
                />
              </div>
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
              <div className="mt-3 space-y-2">
                <input
                  value={draft.homeBannerUrl}
                  onChange={(event) => handleChange("homeBannerUrl", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="https://.../banner.jpg 或点击下方上传"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => bannerFileRef.current?.click()}
                    disabled={uploading.banner}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    <ImageIcon className="h-3 w-3" />
                    {uploading.banner ? "上传中..." : "上传Banner"}
                  </button>
                  {draft.homeBannerUrl && (
                    <a
                      href={draft.homeBannerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      预览 →
                    </a>
                  )}
                </div>
                <input
                  ref={bannerFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload("homeBannerUrl", bannerFileRef, "banner")}
                  className="hidden"
                />
              </div>
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
