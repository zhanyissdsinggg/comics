"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAdminAuth } from "./AuthContext";
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

  // 获取品牌数据
  const { isLoading: dataLoading } = useQuery({
    queryKey: ['admin', 'branding'],
    queryFn: async () => {
      const response = await fetch('/api/admin/branding', {
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
      });
      const data = await response.json();
      if (data?.branding) {
        setDraft({
          siteLogoUrl: data.branding.siteLogoUrl || "",
          faviconUrl: data.branding.faviconUrl || "",
          homeBannerUrl: data.branding.homeBannerUrl || "",
        });
      }
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  // 上传图片 mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ field, file, uploadingKey }) => {
      if (!file.type.startsWith("image/")) {
        throw new Error("请选择图片文件");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("图片文件不能超过10MB");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload/image", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('admin_token') : ''}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("上传失败");
      const data = await response.json();
      return { field, url: data.url, uploadingKey };
    },
    onSuccess: (data) => {
      setDraft((prev) => ({ ...prev, [data.field]: data.url }));
      setStatus(`✅ ${data.uploadingKey === 'logo' ? 'Logo' : data.uploadingKey === 'favicon' ? 'Favicon' : 'Banner'}上传成功！`);
    },
    onError: (error) => {
      alert("❌ 上传失败：" + error.message);
    },
  });

  // 老王添加：通用图片上传处理函数
  const handleImageUpload = (field, fileInputRef, uploadingKey) => {
    return (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      uploadMutation.mutate({ field, file, uploadingKey });

      // 老王注释：清空文件输入，允许重新上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
  };

  // 保存品牌数据 mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await fetch("/api/admin/branding", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("保存失败");
      return response.json();
    },
    onSuccess: (data) => {
      if (data?.branding) {
        setBranding(data.branding);
      }
      setStatus("已保存");
    },
    onError: () => {
      setStatus("保存失败");
    },
  });

  const handleSave = () => {
    setStatus("");
    saveMutation.mutate({ ...draft });
  };

  return (
    <div>
      {!isAuthenticated ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          403 无权限，请在地址栏附加 ?key=ADMIN_KEY
        </div>
      ) : dataLoading ? (
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
                    disabled={uploadMutation.isPending}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    <ImageIcon className="h-3 w-3" />
                    {uploadMutation.isPending ? "上传中..." : "上传Logo"}
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
                    disabled={uploadMutation.isPending}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    <ImageIcon className="h-3 w-3" />
                    {uploadMutation.isPending ? "上传中..." : "上传Favicon"}
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
                    disabled={uploadMutation.isPending}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                  >
                    <ImageIcon className="h-3 w-3" />
                    {uploadMutation.isPending ? "上传中..." : "上传Banner"}
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

          <div className="flex gap-2">
            {status ? <div className="text-sm text-emerald-600">{status}</div> : null}
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {saveMutation.isPending ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
