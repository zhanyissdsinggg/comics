"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Image as ImageIcon, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminFeedbackBanner } from "@/components/admin/common/AdminFeedbackBanner";
import {
  AdminBadge,
  AdminMetricCard,
  AdminPageSection,
  adminInputClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { useAdminAuth } from "./AuthContext";
import { useBrandingStore } from "../../store/useBrandingStore";
import {
  adminGet,
  adminPost,
  adminUpload,
  normalizeAdminErrorMessage,
} from "../../lib/adminApiClient";

const defaultDraft = {
  siteLogoUrl: "",
  faviconUrl: "",
  homeBannerUrl: "",
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const ASSET_FIELDS = [
  {
    field: "siteLogoUrl",
    keyName: "logo",
    label: "站点标识",
    helperText: "建议使用透明 PNG 或 SVG。",
    placeholder: "https://cdn.example.com/brand/logo.png",
    emptyText: "还没有上传站点标识。",
    buttonLabel: "上传标识",
    previewClassName: "h-10 w-auto object-contain",
  },
  {
    field: "faviconUrl",
    keyName: "favicon",
    label: "站点图标",
    helperText: "建议使用 32x32 或 64x64 图标。",
    placeholder: "https://cdn.example.com/brand/favicon.png",
    emptyText: "还没有上传站点图标。",
    buttonLabel: "上传图标",
    previewClassName: "h-10 w-10 rounded-[14px] object-cover",
  },
  {
    field: "homeBannerUrl",
    keyName: "banner",
    label: "首页横幅",
    helperText: "适合放干净、克制的主视觉。",
    placeholder: "https://cdn.example.com/brand/home-banner.jpg",
    emptyText: "还没有上传首页横幅。",
    buttonLabel: "上传横幅",
    previewClassName: "h-full max-h-28 w-full rounded-[20px] object-cover",
  },
];

function toDraft(payload) {
  return {
    siteLogoUrl: payload?.siteLogoUrl || "",
    faviconUrl: payload?.faviconUrl || "",
    homeBannerUrl: payload?.homeBannerUrl || "",
  };
}

function PreviewSurface({ value, alt, emptyText, className }) {
  return (
    <div className="mt-4 flex min-h-28 items-center justify-center rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
      {value ? (
        <img src={value} alt={alt} className={className} />
      ) : (
        <span className="max-w-[18rem] text-center text-sm leading-6 text-slate-400">
          {emptyText}
        </span>
      )}
    </div>
  );
}

export default function AdminBrandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const { setBranding } = useBrandingStore();

  const [draft, setDraft] = useState(defaultDraft);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
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
        throw new Error(
          response.error || response.message || "品牌配置加载失败。",
        );
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
      setDraft((current) => ({ ...current, [data.field]: data.url }));
      const label =
        ASSET_FIELDS.find((asset) => asset.keyName === data.keyName)?.label ||
        "素材";
      setFeedback({ type: "success", message: `${label}已上传。` });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: normalizeAdminErrorMessage(error, "上传失败。"),
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await adminPost("/api/admin/branding", payload);
      if (!response.ok) {
        throw new Error(
          response.error || response.message || "品牌配置保存失败。",
        );
      }
      return toDraft(response.data?.branding);
    },
    onSuccess: (nextDraft) => {
      setDraft(nextDraft);
      setBranding(nextDraft);
      setHasHydratedDraft(true);
      setFeedback({ type: "success", message: "品牌配置已保存。" });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: normalizeAdminErrorMessage(error, "品牌配置保存失败。"),
      });
    },
  });

  const handleChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleImageUpload = (field, inputRef, keyName) => (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFeedback({ type: "", message: "" });
    uploadMutation.mutate({ field, file, keyName });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!hasHydratedDraft) {
      return;
    }

    setFeedback({ type: "", message: "" });
    saveMutation.mutate({ ...draft });
  };

  const activeUploadField = uploadMutation.variables?.field || "";
  const configuredAssetCount = useMemo(
    () => Object.values(draft).filter(Boolean).length,
    [draft],
  );
  const formBusy =
    !hasHydratedDraft ||
    brandingQuery.isLoading ||
    uploadMutation.isPending ||
    saveMutation.isPending;

  if (isLoading || !isAuthenticated) {
    return (
      <AdminPageSection
        title="品牌素材"
        description="确认权限后再编辑线上品牌素材。"
      >
        <p className="text-sm text-slate-500">正在加载品牌配置...</p>
      </AdminPageSection>
    );
  }

  if (!hasHydratedDraft && brandingQuery.isLoading) {
    return (
      <AdminPageSection
        title="品牌素材"
        description="正在读取已保存的素材配置。"
      >
        <p className="text-sm text-slate-500">正在加载品牌配置...</p>
      </AdminPageSection>
    );
  }

  if (!hasHydratedDraft && brandingQuery.isError) {
    return (
      <AdminPageSection
        title="品牌素材"
        description="已保存的品牌配置暂时无法读取。"
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => brandingQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            重试
          </Button>
        }
      >
        <AdminFeedbackBanner
          feedback={{
            type: "error",
            message:
              brandingQuery.error instanceof Error
                ? normalizeAdminErrorMessage(
                    brandingQuery.error,
                    "品牌配置加载失败。",
                  )
                : "品牌配置加载失败。",
          }}
          onDismiss={() => undefined}
          dismissLabel="关闭"
        />
      </AdminPageSection>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <AdminMetricCard
          label="已配置素材"
          value={`${configuredAssetCount}/3`}
          detail="标识、图标和首页横幅。"
          tone="accent"
        />
        <AdminMetricCard
          label="上传上限"
          value="10 MB"
          detail="兼顾清晰和加载速度。"
        />
        <AdminMetricCard
          label="影响范围"
          value="前台观感"
          detail="会影响头部、图标和首页视觉。"
        />
      </div>

      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback({ type: "", message: "" })}
      />

      <AdminPageSection
        title="品牌素材"
        description="统一维护站点标识、图标和首页横幅。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge
              tone={configuredAssetCount === 3 ? "success" : "accent"}
            >
              {configuredAssetCount === 3 ? "素材完整" : "待补素材"}
            </AdminBadge>
            <Button
              type="button"
              onClick={handleSave}
              disabled={formBusy}
              data-testid="admin-branding-save"
            >
              {saveMutation.isPending ? "保存中..." : "保存品牌配置"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-5 xl:grid-cols-3">
          {ASSET_FIELDS.map((asset) => {
            const inputRef =
              asset.field === "siteLogoUrl"
                ? logoFileRef
                : asset.field === "faviconUrl"
                  ? faviconFileRef
                  : bannerFileRef;
            const isUploadingThisAsset =
              uploadMutation.isPending && activeUploadField === asset.field;
            const value = draft[asset.field];

            return (
              <article
                key={asset.field}
                className="rounded-[28px] border border-[color:var(--gush-border)] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.035)] ring-1 ring-black/[0.02]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">
                      {asset.label}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {asset.helperText}
                    </p>
                  </div>
                  <AdminBadge tone={value ? "success" : "default"}>
                    {value ? "已配置" : "待补"}
                  </AdminBadge>
                </div>

                <div className="mt-5 space-y-3">
                  <input
                    value={value}
                    onChange={(event) =>
                      handleChange(asset.field, event.target.value)
                    }
                    disabled={formBusy}
                    className={adminInputClassName}
                    placeholder={asset.placeholder}
                    data-testid={`admin-branding-${asset.keyName}-input`}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => inputRef.current?.click()}
                      disabled={formBusy}
                    >
                      <ImageIcon className="size-4" />
                      {isUploadingThisAsset ? "上传中..." : asset.buttonLabel}
                    </Button>
                    {value ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950"
                      >
                        <ExternalLink className="size-4" />
                        查看素材
                      </a>
                    ) : null}
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload(
                        asset.field,
                        inputRef,
                        asset.keyName,
                      )}
                      disabled={formBusy}
                      className="hidden"
                    />
                  </div>
                </div>

                <PreviewSurface
                  value={value}
                  alt={asset.label}
                  emptyText={asset.emptyText}
                  className={asset.previewClassName}
                />
              </article>
            );
          })}
        </div>
      </AdminPageSection>
    </div>
  );
}
