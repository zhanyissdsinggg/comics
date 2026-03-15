"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Image as ImageIcon } from "lucide-react";
import { useAdminAuth } from "./AuthContext";
import { useBrandingStore } from "../../store/useBrandingStore";
import { adminGet, adminPost, adminUpload } from "../../lib/adminApiClient";

const defaultDraft = {
  siteLogoUrl: "",
  faviconUrl: "",
  homeBannerUrl: "",
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function PreviewBox({ value, alt, emptyText, className }) {
  return (
    <div className="mt-4 flex h-20 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
      {value ? (
        <img src={value} alt={alt} className={className} />
      ) : (
        <span className="text-xs text-slate-400">{emptyText}</span>
      )}
    </div>
  );
}

function toDraft(payload) {
  return {
    siteLogoUrl: payload?.siteLogoUrl || "",
    faviconUrl: payload?.faviconUrl || "",
    homeBannerUrl: payload?.homeBannerUrl || "",
  };
}

function ErrorState({ message, onRetry }) {
  return (
    <section className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6">
      <div>
        <h2 className="text-lg font-semibold text-red-900">品牌配置加载失败</h2>
        <p className="mt-2 text-sm text-red-700">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        重试
      </button>
    </section>
  );
}

export default function AdminBrandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const { setBranding } = useBrandingStore();

  const [draft, setDraft] = useState(defaultDraft);
  const [status, setStatus] = useState("");
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  const logoFileRef = useRef(null);
  const faviconFileRef = useRef(null);
  const bannerFileRef = useRef(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const brandingQuery = useQuery({
    queryKey: ["admin", "branding"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await adminGet("/api/admin/branding");
      if (!response.ok) {
        throw new Error(response.error || response.message || "品牌配置加载失败。");
      }
      return toDraft(response.data?.branding);
    },
  });

  useEffect(() => {
    if (!hasHydratedDraft && brandingQuery.data) {
      setDraft(brandingQuery.data);
      setHasHydratedDraft(true);
    }
  }, [brandingQuery.data, hasHydratedDraft]);

  const uploadMutation = useMutation({
    mutationFn: async ({ field, file, keyName }) => {
      if (!file.type.startsWith("image/")) {
        throw new Error("请上传图片文件。");
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("图片大小不能超过 10 MB。");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await adminUpload("/api/admin/upload/image", formData);
      if (!response.ok || !response.data?.url) {
        throw new Error(response.error || response.message || "上传失败。");
      }

      return { field, keyName, url: response.data.url };
    },
    onSuccess: (data) => {
      setDraft((prev) => ({ ...prev, [data.field]: data.url }));
      const label =
        data.keyName === "logo"
          ? "站点标识"
          : data.keyName === "favicon"
            ? "站点图标"
            : "首页横幅";
      setStatus(`${label}上传成功。`);
    },
    onError: (error) => {
      setStatus(`上传失败：${error.message}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await adminPost("/api/admin/branding", payload);
      if (!response.ok) {
        throw new Error(response.error || response.message || "保存失败。");
      }

      return toDraft(response.data?.branding);
    },
    onSuccess: (nextDraft) => {
      setDraft(nextDraft);
      setBranding(nextDraft);
      setHasHydratedDraft(true);
      setStatus("品牌配置已保存。");
    },
    onError: (error) => {
      setStatus(error.message || "保存失败。");
    },
  });

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (field, inputRef, keyName) => (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    uploadMutation.mutate({ field, file, keyName });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!hasHydratedDraft) {
      return;
    }

    setStatus("");
    saveMutation.mutate({ ...draft });
  };

  const formBusy = !hasHydratedDraft || brandingQuery.isLoading || uploadMutation.isPending || saveMutation.isPending;

  if (isLoading || !isAuthenticated) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">加载中...</p>
      </section>
    );
  }

  if (!hasHydratedDraft && brandingQuery.isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">正在加载品牌配置...</p>
      </section>
    );
  }

  if (!hasHydratedDraft && brandingQuery.isError) {
    return (
      <ErrorState
        message={brandingQuery.error instanceof Error ? brandingQuery.error.message : "品牌配置加载失败。"}
        onRetry={() => brandingQuery.refetch()}
      />
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <header className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">品牌设置</h2>
        <p className="text-sm text-slate-500">
          配置站点标识、图标和首页横幅资源。
        </p>
      </header>

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-800">站点标识地址</h3>
            <p className="mt-1 text-xs text-slate-400">
              建议使用透明背景的 PNG 或 SVG。
            </p>
            <div className="mt-3 space-y-2">
              <input
                value={draft.siteLogoUrl}
                onChange={(event) => handleChange("siteLogoUrl", event.target.value)}
                disabled={formBusy}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://.../logo.png"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={formBusy}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-purple-700 disabled:opacity-50"
                >
                  <ImageIcon className="h-3 w-3" />
                  {uploadMutation.isPending ? "上传中..." : "上传站点标识"}
                </button>
                {draft.siteLogoUrl ? (
                  <a
                    href={draft.siteLogoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 transition-colors hover:text-blue-700"
                  >
                    打开链接
                  </a>
                ) : null}
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload("siteLogoUrl", logoFileRef, "logo")}
                  disabled={formBusy}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-800">站点标识预览</h3>
            <PreviewBox
              value={draft.siteLogoUrl}
              alt="站点标识"
              emptyText="尚未选择站点标识"
              className="h-10 w-auto"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-800">站点图标地址（.ico/.png）</h3>
            <p className="mt-1 text-xs text-slate-400">
              推荐尺寸：32x32 或 64x64。
            </p>
            <div className="mt-3 space-y-2">
              <input
                value={draft.faviconUrl}
                onChange={(event) => handleChange("faviconUrl", event.target.value)}
                disabled={formBusy}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://.../favicon.png"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => faviconFileRef.current?.click()}
                  disabled={formBusy}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-purple-700 disabled:opacity-50"
                >
                  <ImageIcon className="h-3 w-3" />
                  {uploadMutation.isPending ? "上传中..." : "上传图标"}
                </button>
                <input
                  ref={faviconFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload("faviconUrl", faviconFileRef, "favicon")}
                  disabled={formBusy}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-800">图标预览</h3>
            <PreviewBox
              value={draft.faviconUrl}
              alt="站点图标"
              emptyText="尚未选择图标"
              className="h-8 w-8"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-800">首页横幅地址</h3>
            <p className="mt-1 text-xs text-slate-400">
              推荐比例：16:9 或 3:1。
            </p>
            <div className="mt-3 space-y-2">
              <input
                value={draft.homeBannerUrl}
                onChange={(event) => handleChange("homeBannerUrl", event.target.value)}
                disabled={formBusy}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://.../banner.jpg"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bannerFileRef.current?.click()}
                  disabled={formBusy}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-purple-700 disabled:opacity-50"
                >
                  <ImageIcon className="h-3 w-3" />
                  {uploadMutation.isPending ? "上传中..." : "上传横幅"}
                </button>
                <input
                  ref={bannerFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload("homeBannerUrl", bannerFileRef, "banner")}
                  disabled={formBusy}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-800">横幅预览</h3>
            <PreviewBox
              value={draft.homeBannerUrl}
              alt="首页横幅"
              emptyText="尚未选择横幅"
              className="h-full max-h-20 w-full rounded-lg object-cover"
            />
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={formBusy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? "保存中..." : "保存品牌配置"}
        </button>
        {status ? <p className="text-xs text-slate-600">{status}</p> : null}
      </footer>
    </section>
  );
}
