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
import { adminGet, adminPost, adminUpload } from "../../lib/adminApiClient";

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
    label: "站点 Logo",
    helperText: "优先使用透明 PNG 或 SVG，让页头和页脚里的品牌标识保持干净。",
    placeholder: "https://.../logo.png",
    emptyText: "还没有上传站点 Logo。",
    buttonLabel: "上传 Logo",
    previewClassName: "h-10 w-auto object-contain",
  },
  {
    field: "faviconUrl",
    keyName: "favicon",
    label: "网站图标",
    helperText: "尽量保持为轻量方图，32x32 或 64x64 的素材通常就够用。",
    placeholder: "https://.../favicon.png",
    emptyText: "还没有上传网站图标。",
    buttonLabel: "上传网站图标",
    previewClassName: "h-10 w-10 rounded-[14px] object-cover",
  },
  {
    field: "homeBannerUrl",
    keyName: "banner",
    label: "首页横幅",
    helperText: "这里更适合克制的编辑向主视觉，不要做成吵闹的促销大图。",
    placeholder: "https://.../banner.jpg",
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
    <div className="mt-4 flex min-h-28 items-center justify-center rounded-[24px] border border-dashed border-black/10 bg-[rgba(250,247,241,0.82)] p-4">
      {value ? (
        <img src={value} alt={alt} className={className} />
      ) : (
        <span className="max-w-[18rem] text-center text-sm leading-6 text-slate-400">{emptyText}</span>
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
      setDraft((current) => ({ ...current, [data.field]: data.url }));
      const label = ASSET_FIELDS.find((asset) => asset.keyName === data.keyName)?.label || "素材";
      setFeedback({ type: "success", message: `${label}已上传。` });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message || "上传失败。" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await adminPost("/api/admin/branding", payload);
      if (!response.ok) {
        throw new Error(response.error || response.message || "品牌配置保存失败。");
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
      setFeedback({ type: "error", message: error.message || "品牌配置保存失败。" });
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
    !hasHydratedDraft || brandingQuery.isLoading || uploadMutation.isPending || saveMutation.isPending;

  if (isLoading || !isAuthenticated) {
    return (
      <AdminPageSection title="品牌素材" description="确认管理员权限后，再编辑线上品牌素材。">
        <p className="text-sm text-slate-500">正在加载品牌配置...</p>
      </AdminPageSection>
    );
  }

  if (!hasHydratedDraft && brandingQuery.isLoading) {
    return (
      <AdminPageSection title="品牌素材" description="先把已保存的素材配置加载出来，再继续编辑草稿。">
        <p className="text-sm text-slate-500">正在加载品牌配置...</p>
      </AdminPageSection>
    );
  }

  if (!hasHydratedDraft && brandingQuery.isError) {
    return (
      <AdminPageSection
        title="品牌素材"
        description="已保存的品牌配置暂时无法读取，在数据恢复前这里会保持只读。"
        action={
          <Button type="button" variant="outline" onClick={() => brandingQuery.refetch()}>
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
                ? brandingQuery.error.message
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
          detail="Logo、网站图标和首页横幅统一归在这一套品牌素材里。"
          tone="accent"
        />
        <AdminMetricCard
          label="上传上限"
          value="10 MB"
          detail="允许上传大图，但这里仍会限制到便于复核和替换的范围。"
        />
        <AdminMetricCard
          label="影响范围"
          value="页头、标签、首页"
          detail="这些素材会直接影响前台观感，所以改动要克制、统一、可复核。"
        />
      </div>

      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback({ type: "", message: "" })}
      />

      <AdminPageSection
        title="品牌素材"
        description="把共享 Logo、网站图标和首页横幅收在一个安静的工作区里统一维护。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={configuredAssetCount === 3 ? "success" : "accent"}>
              {configuredAssetCount === 3 ? "可进入复核" : "素材仍待补齐"}
            </AdminBadge>
            <Button type="button" onClick={handleSave} disabled={formBusy}>
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
            const isUploadingThisAsset = uploadMutation.isPending && activeUploadField === asset.field;
            const value = draft[asset.field];

            return (
              <article
                key={asset.field}
                className="rounded-[28px] border border-black/8 bg-white/88 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{asset.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{asset.helperText}</p>
                  </div>
                  <AdminBadge tone={value ? "success" : "default"}>{value ? "已配置" : "待补"}</AdminBadge>
                </div>

                <div className="mt-5 space-y-3">
                  <input
                    value={value}
                    onChange={(event) => handleChange(asset.field, event.target.value)}
                    disabled={formBusy}
                    className={adminInputClassName}
                    placeholder={asset.placeholder}
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
                        className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"
                      >
                        <ExternalLink className="size-4" />
                        查看素材
                      </a>
                    ) : null}
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload(asset.field, inputRef, asset.keyName)}
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

      <AdminPageSection
        title="编辑说明"
        description="这里修改的是共享前台素材，所以规则要简单明确，不要引入花哨控制。"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.82)] px-4 py-4 text-sm leading-6 text-slate-600">
            上传完成后记得保存，让前台品牌配置读取到最新素材。
          </div>
          <div className="rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.82)] px-4 py-4 text-sm leading-6 text-slate-600">
            素材尽量保持中性、清楚、可读，它们会贴着内容区出现，不是活动海报位。
          </div>
          <div className="rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.82)] px-4 py-4 text-sm leading-6 text-slate-600">
            必要时可以直接填素材链接，但更建议在这里上传，方便运营复核线上实际文件。
          </div>
        </div>
      </AdminPageSection>
    </div>
  );
}
