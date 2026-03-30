"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AdminBadge,
  AdminFormField,
  AdminPageSection,
  adminInputClassName,
  adminTextareaClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { adminGet as apiGet, adminPost as apiPost } from "../../lib/adminApiClient";

const TRACKING_GROUPS = [
  {
    id: "facebook",
    title: "Facebook 像素",
    desc: "用于维护 Facebook 广告归因需要的像素标识、访问令牌和页面注入脚本。",
    fields: [
      {
        key: "pixelId",
        label: "像素 ID",
        legacyName: "Pixel ID",
        placeholder: "例如：1234567890",
        inputType: "text",
      },
      {
        key: "accessToken",
        label: "访问令牌",
        legacyName: "Access Token",
        placeholder: "用于 CAPI 请求的访问令牌",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "页面头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* fb pixel */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "页面主体脚本",
        legacyName: "Script (Body)",
        placeholder: "<noscript>...</noscript>",
        inputType: "textarea",
      },
    ],
    sample: "<script>/* facebook pixel */</script>",
  },
  {
    id: "instagram",
    title: "Instagram",
    desc: "用于维护 Instagram 活动转化归因与受众信号所需的配置。",
    fields: [
      {
        key: "businessId",
        label: "企业 ID",
        legacyName: "Business ID",
        placeholder: "例如：IG-BIZ-XXXX",
        inputType: "text",
      },
      {
        key: "accessToken",
        label: "访问令牌",
        legacyName: "Access Token",
        placeholder: "用于 API 请求的访问令牌",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "页面头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* instagram */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "页面主体脚本",
        legacyName: "Script (Body)",
        placeholder: "<noscript>...</noscript>",
        inputType: "textarea",
      },
    ],
    sample: "<script>/* instagram tracking */</script>",
  },
  {
    id: "snapchat",
    title: "Snapchat 像素",
    desc: "用于同步 Snapchat Ads 的像素标识、令牌和转化脚本。",
    fields: [
      {
        key: "pixelId",
        label: "像素 ID",
        legacyName: "Pixel ID",
        placeholder: "例如：SNAP-PIXEL-XXXX",
        inputType: "text",
      },
      {
        key: "apiToken",
        label: "API 令牌",
        legacyName: "API Token",
        placeholder: "用于转化 API 的令牌",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "页面头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* snap pixel */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "页面主体脚本",
        legacyName: "Script (Body)",
        placeholder: "<noscript>...</noscript>",
        inputType: "textarea",
      },
    ],
    sample: "<script>/* snapchat pixel */</script>",
  },
  {
    id: "google",
    title: "Google Analytics / Ads",
    desc: "用于维护 GA4、Google Ads 以及相关转化追踪脚本。",
    fields: [
      {
        key: "measurementId",
        label: "测量 ID",
        legacyName: "Measurement ID",
        placeholder: "例如：G-XXXXXXX",
        inputType: "text",
      },
      {
        key: "adsConversionId",
        label: "Ads 转化 ID",
        legacyName: "Ads Conversion ID",
        placeholder: "例如：AW-XXXXXXX",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "页面头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* gtag */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "页面主体脚本",
        legacyName: "Script (Body)",
        placeholder: "<noscript>...</noscript>",
        inputType: "textarea",
      },
    ],
    sample: "<script>/* gtag */</script>",
  },
  {
    id: "global",
    title: "全局脚本",
    desc: "用于配置不依赖具体平台的通用跟踪代码或公共注入片段。",
    fields: [
      {
        key: "headScript",
        label: "页面头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* any */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "页面主体脚本",
        legacyName: "Script (Body)",
        placeholder: "<noscript>...</noscript>",
        inputType: "textarea",
      },
    ],
    sample: "<script>/* custom */</script>",
  },
];

const STORAGE_KEY = "mn_tracking_settings_v1";

function cloneValues(values) {
  return JSON.parse(JSON.stringify(values));
}

function createDefaults() {
  const defaults = {};
  TRACKING_GROUPS.forEach((group) => {
    defaults[group.id] = {};
    group.fields.forEach((field) => {
      defaults[group.id][field.key] = "";
    });
  });
  return defaults;
}

function normalizeValues(input, defaults) {
  const next = cloneValues(defaults);
  if (!input || typeof input !== "object") {
    return next;
  }

  TRACKING_GROUPS.forEach((group) => {
    const groupValues =
      input[group.id] && typeof input[group.id] === "object" ? input[group.id] : {};

    group.fields.forEach((field) => {
      const stableValue = groupValues[field.key];
      const legacyValue = groupValues[field.legacyName];
      const value =
        typeof stableValue === "string"
          ? stableValue
          : typeof legacyValue === "string"
            ? legacyValue
            : "";

      next[group.id][field.key] = value;
    });
  });

  return next;
}

function parseTimestamp(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatSavedAt(value) {
  const parsed = parseTimestamp(value);
  if (!parsed) {
    return "尚未保存";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(parsed));
}

function readLocalTrackingSnapshot(defaults) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const savedAt = typeof parsed?.savedAt === "string" ? parsed.savedAt : "";

    return {
      values: normalizeValues(parsed?.values, defaults),
      savedAt,
      savedAtMs: parseTimestamp(savedAt),
    };
  } catch {
    return null;
  }
}

function writeLocalTrackingSnapshot(values, savedAt, shouldBroadcast = true) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      savedAt,
      values,
    }),
  );

  if (shouldBroadcast) {
    window.dispatchEvent(new Event("tracking:reload"));
  }
}

const STATUS_STYLES = {
  neutral: "border-black/8 bg-[rgba(250,247,241,0.9)] text-slate-700",
  success: "border-emerald-200 bg-emerald-50/90 text-emerald-700",
  warning: "border-amber-200 bg-amber-50/90 text-amber-700",
  danger: "border-red-200 bg-red-50/90 text-red-700",
};

const STATUS_BADGE_TONE = {
  neutral: "default",
  success: "success",
  warning: "warning",
  danger: "danger",
};

function getFieldHelperText(field) {
  if (field.inputType === "textarea") {
    return "粘贴提供商要求的脚本片段，保存时保持原样。";
  }

  return "保持和投放平台上的配置完全一致。";
}

export default function TrackingSettings() {
  const defaultValues = useMemo(() => createDefaults(), []);
  const [values, setValues] = useState(defaultValues);
  const [savedAt, setSavedAt] = useState("");
  const [status, setStatus] = useState({
    tone: "neutral",
    message: "正在加载跟踪设置...",
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      const localSnapshot = readLocalTrackingSnapshot(defaultValues);

      if (localSnapshot && mounted) {
        setValues(localSnapshot.values);
        if (localSnapshot.savedAt) {
          setSavedAt(localSnapshot.savedAt);
        }
        setStatus({
          tone: "neutral",
          message: "已先载入本地草稿，同时正在检查服务器配置。",
        });
      }

      try {
        const response = await apiGet("/api/admin/tracking");
        if (!mounted) {
          return;
        }

        if (response.ok && response.data?.config) {
          const serverUpdatedAt =
            typeof response.data.config.updatedAt === "string"
              ? response.data.config.updatedAt
              : "";
          const serverUpdatedAtMs = parseTimestamp(serverUpdatedAt);

          if (localSnapshot?.savedAtMs && localSnapshot.savedAtMs > serverUpdatedAtMs) {
            setValues(localSnapshot.values);
            if (localSnapshot.savedAt) {
              setSavedAt(localSnapshot.savedAt);
            }
            setDirty(true);
            setReadOnly(false);
            setStatus({
              tone: "warning",
              message: "当前正在使用更新日期更晚的本地草稿。点击保存后会把它同步到服务器。",
            });
            setHydrating(false);
            return;
          }

          const normalizedValues = normalizeValues(response.data.config.values, defaultValues);
          setValues(normalizedValues);
          setSavedAt(serverUpdatedAt);
          setDirty(false);
          setReadOnly(false);
          writeLocalTrackingSnapshot(normalizedValues, serverUpdatedAt, false);
          setStatus({
            tone: "success",
            message: "已从服务器载入当前跟踪配置。",
          });
          setHydrating(false);
          return;
        }

        if (response.status === 401 || response.status === 403) {
          setReadOnly(true);
          setDirty(false);
          setStatus({
            tone: "warning",
            message: "当前账号没有编辑或同步跟踪设置的权限，页面已切为只读模式。",
          });
          setHydrating(false);
          return;
        }

        setStatus({
          tone: "danger",
          message: response.error || "服务器配置读取失败，当前仍会保留本地草稿。",
        });
      } catch {
        if (!mounted) {
          return;
        }
        setStatus({
          tone: "danger",
          message: "服务器配置读取失败，当前仍会保留本地草稿。",
        });
      } finally {
        if (mounted) {
          setHydrating(false);
        }
      }
    };

    hydrate();

    return () => {
      mounted = false;
    };
  }, [defaultValues]);

  const handleChange = (groupId, fieldKey, nextValue) => {
    if (readOnly) {
      return;
    }

    setValues((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        [fieldKey]: nextValue,
      },
    }));
    setDirty(true);
    setStatus({
      tone: "neutral",
      message: "草稿已变更，保存全部修改后会同步当前版本。",
    });
  };

  const handleSave = async () => {
    if (typeof window === "undefined" || saving || readOnly) {
      return;
    }

    const localTimestamp = new Date().toISOString();
    writeLocalTrackingSnapshot(values, localTimestamp, true);
    setSavedAt(localTimestamp);
    setStatus({
      tone: "neutral",
      message: "草稿已先保存到本地，正在同步到服务器...",
    });
    setSaving(true);

    try {
      const response = await apiPost("/api/admin/tracking", { values });

      if (response.ok && response.data?.config) {
        const normalizedValues = normalizeValues(response.data.config.values, defaultValues);
        const syncedAt =
          typeof response.data.config.updatedAt === "string"
            ? response.data.config.updatedAt
            : localTimestamp;

        setValues(normalizedValues);
        setSavedAt(syncedAt);
        setDirty(false);
        writeLocalTrackingSnapshot(normalizedValues, syncedAt, true);
        setStatus({
          tone: "success",
          message: "已保存到本地，并成功同步到服务器。",
        });
        return;
      }

      if (response.status === 401 || response.status === 403) {
        setReadOnly(true);
        setDirty(false);
        setStatus({
          tone: "warning",
          message: "草稿已保存到本地，但当前账号没有权限同步到服务器。",
        });
        return;
      }

      setStatus({
        tone: "danger",
        message: response.error || "服务器保存失败，但草稿仍保存在本地。",
      });
    } catch {
      setStatus({
        tone: "danger",
        message: "服务器保存失败，但草稿仍保存在本地。",
      });
    } finally {
      setSaving(false);
    }
  };

  const syncStateLabel = readOnly ? "只读模式" : dirty ? "待同步" : "已同步";
  const syncStateDetail = readOnly
    ? "当前账号只能查看配置，不能提交到服务器。"
    : dirty
      ? "页面里还有未同步到服务器的变更。"
      : "本地草稿和服务器配置目前保持一致。";
  const localModeLabel = hydrating
    ? "正在比对版本"
    : dirty
      ? "本地草稿优先"
      : "服务器版本优先";

  return (
    <div className="space-y-6">
      <AdminPageSection
        title="同步状态"
        description="先把本地草稿、服务器版本和权限状态讲清楚，再决定是否继续调整平台脚本。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={STATUS_BADGE_TONE[status.tone] || "default"}>
              {syncStateLabel}
            </AdminBadge>
            <Button
              type="button"
              onClick={handleSave}
              disabled={hydrating || saving || readOnly || !dirty}
            >
              {saving ? "正在保存全部修改..." : "保存全部修改"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div
            className={`rounded-[24px] border px-4 py-4 text-sm leading-6 ${STATUS_STYLES[status.tone] || STATUS_STYLES.neutral}`}
          >
            <p className="text-sm font-semibold text-current">当前状态</p>
            <p className="mt-2">{status.message}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-black/8 bg-white/78 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                最近保存
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950">{formatSavedAt(savedAt)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                本地草稿和服务器同步成功时都会更新这个时间。
              </p>
            </div>

            <div className="rounded-[24px] border border-black/8 bg-white/78 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                版本来源
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950">{localModeLabel}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                页面会优先保留更新时间更晚的版本，避免把新草稿被旧配置覆盖。
              </p>
            </div>

            <div className="rounded-[24px] border border-black/8 bg-white/78 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                当前模式
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950">{syncStateLabel}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{syncStateDetail}</p>
            </div>
          </div>
        </div>
      </AdminPageSection>

      <AdminPageSection
        title="平台配置"
        description="每个平台都按同一套节奏维护：先填标识，再补令牌，最后放脚本，让配置页面保持整洁、可读、可回扫。"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {TRACKING_GROUPS.map((group) => (
            <section
              key={group.id}
              className="rounded-[26px] border border-black/8 bg-white/82 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">{group.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{group.desc}</p>
                </div>
                <AdminBadge tone="default">{group.fields.length} 项</AdminBadge>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {group.fields.map((field) => {
                  const isTextarea = field.inputType === "textarea";

                  return (
                    <AdminFormField
                      key={field.key}
                      label={field.label}
                      helperText={getFieldHelperText(field)}
                      className={isTextarea ? "sm:col-span-2" : ""}
                    >
                      {isTextarea ? (
                        <textarea
                          rows={4}
                          placeholder={field.placeholder}
                          value={values[group.id]?.[field.key] || ""}
                          onChange={(event) =>
                            handleChange(group.id, field.key, event.target.value)
                          }
                          disabled={readOnly || hydrating}
                          className={adminTextareaClassName}
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={values[group.id]?.[field.key] || ""}
                          onChange={(event) =>
                            handleChange(group.id, field.key, event.target.value)
                          }
                          disabled={readOnly || hydrating}
                          className={adminInputClassName}
                        />
                      )}
                    </AdminFormField>
                  );
                })}
              </div>

              <div className="mt-5 rounded-[22px] border border-black/8 bg-[rgba(250,247,241,0.82)] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  示例片段
                </p>
                <code className="mt-3 block break-all text-xs leading-6 text-slate-600">
                  {group.sample}
                </code>
              </div>
            </section>
          ))}
        </div>
      </AdminPageSection>
    </div>
  );
}
