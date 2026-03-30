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
    label: "Site logo",
    helperText: "Use a transparent PNG or SVG so the mark stays clean in the header and footer.",
    placeholder: "https://.../logo.png",
    emptyText: "No site logo has been added yet.",
    buttonLabel: "Upload logo",
    previewClassName: "h-10 w-auto object-contain",
  },
  {
    field: "faviconUrl",
    keyName: "favicon",
    label: "Favicon",
    helperText: "Keep this square and lightweight. A 32x32 or 64x64 file works well.",
    placeholder: "https://.../favicon.png",
    emptyText: "No favicon has been added yet.",
    buttonLabel: "Upload favicon",
    previewClassName: "h-10 w-10 rounded-[14px] object-cover",
  },
  {
    field: "homeBannerUrl",
    keyName: "banner",
    label: "Homepage banner",
    helperText: "Use editorial artwork that still feels calm in the reader home hero.",
    placeholder: "https://.../banner.jpg",
    emptyText: "No homepage banner has been added yet.",
    buttonLabel: "Upload banner",
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
        throw new Error(response.error || response.message || "Branding settings could not be loaded.");
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
        throw new Error("Upload an image file.");
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("Images must stay under 10 MB.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await adminUpload("/api/admin/upload/image", formData);
      if (!response.ok || !response.data?.url) {
        throw new Error(response.error || response.message || "Upload failed.");
      }

      return { field, keyName, url: response.data.url };
    },
    onSuccess: (data) => {
      setDraft((current) => ({ ...current, [data.field]: data.url }));
      const label = ASSET_FIELDS.find((asset) => asset.keyName === data.keyName)?.label || "Asset";
      setFeedback({ type: "success", message: `${label} uploaded.` });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message || "Upload failed." });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await adminPost("/api/admin/branding", payload);
      if (!response.ok) {
        throw new Error(response.error || response.message || "Branding settings could not be saved.");
      }

      return toDraft(response.data?.branding);
    },
    onSuccess: (nextDraft) => {
      setDraft(nextDraft);
      setBranding(nextDraft);
      setHasHydratedDraft(true);
      setFeedback({ type: "success", message: "Branding settings saved." });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message || "Branding settings could not be saved." });
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
      <AdminPageSection title="Brand assets" description="Wait until admin access is confirmed before editing live brand assets.">
        <p className="text-sm text-slate-500">Loading branding settings...</p>
      </AdminPageSection>
    );
  }

  if (!hasHydratedDraft && brandingQuery.isLoading) {
    return (
      <AdminPageSection title="Brand assets" description="Wait until the saved asset set is hydrated before editing the draft.">
        <p className="text-sm text-slate-500">Loading branding settings...</p>
      </AdminPageSection>
    );
  }

  if (!hasHydratedDraft && brandingQuery.isError) {
    return (
      <AdminPageSection
        title="Brand assets"
        description="The saved brand configuration could not be loaded, so edits stay locked until the source is available again."
        action={
          <Button type="button" variant="outline" onClick={() => brandingQuery.refetch()}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        }
      >
        <AdminFeedbackBanner
          feedback={{
            type: "error",
            message:
              brandingQuery.error instanceof Error
                ? brandingQuery.error.message
                : "Branding settings could not be loaded.",
          }}
          onDismiss={() => undefined}
          dismissLabel="Close"
        />
      </AdminPageSection>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <AdminMetricCard
          label="Assets configured"
          value={`${configuredAssetCount}/3`}
          detail="Logo, favicon, and homepage banner stay in one shared brand set."
          tone="accent"
        />
        <AdminMetricCard
          label="Upload limit"
          value="10 MB"
          detail="Large artwork is allowed, but the upload guard keeps files practical for review."
        />
        <AdminMetricCard
          label="Reader-facing surfaces"
          value="Header, tabs, home"
          detail="These assets shape the live storefront, so changes should stay editorial and restrained."
        />
      </div>

      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback({ type: "", message: "" })}
      />

      <AdminPageSection
        title="Brand assets"
        description="Keep the live storefront coherent by editing the shared logo, favicon, and homepage banner in one quiet workspace."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={configuredAssetCount === 3 ? "success" : "accent"}>
              {configuredAssetCount === 3 ? "Ready for review" : "Needs asset coverage"}
            </AdminBadge>
            <Button type="button" onClick={handleSave} disabled={formBusy}>
              {saveMutation.isPending ? "Saving..." : "Save branding"}
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
                  <AdminBadge tone={value ? "success" : "default"}>{value ? "Configured" : "Missing"}</AdminBadge>
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
                      {isUploadingThisAsset ? "Uploading..." : asset.buttonLabel}
                    </Button>
                    {value ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"
                      >
                        <ExternalLink className="size-4" />
                        Open asset
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
        title="Editing notes"
        description="This workspace changes shared public assets, so it favors simple rules over decorative controls."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.82)] px-4 py-4 text-sm leading-6 text-slate-600">
            Save after uploads so the storefront branding provider picks up the new asset set.
          </div>
          <div className="rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.82)] px-4 py-4 text-sm leading-6 text-slate-600">
            Keep artwork neutral and legible. These assets appear beside editorial surfaces, not flashy promos.
          </div>
          <div className="rounded-[24px] border border-black/8 bg-[rgba(250,247,241,0.82)] px-4 py-4 text-sm leading-6 text-slate-600">
            Use direct asset URLs when needed, but prefer uploads here so operators can review the exact live file.
          </div>
        </div>
      </AdminPageSection>
    </div>
  );
}
