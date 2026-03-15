"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGet as apiGet, adminPost as apiPost } from "../../lib/adminApiClient";

const TRACKING_GROUPS = [
  {
    id: "facebook",
    title: "Facebook Pixel",
    desc: "用于追踪 Facebook 广告转化和归因数据。",
    fields: [
      {
        key: "pixelId",
        label: "Pixel ID",
        legacyName: "Pixel ID",
        placeholder: "例如：1234567890",
        inputType: "text",
      },
      {
        key: "accessToken",
        label: "访问令牌",
        legacyName: "Access Token",
        placeholder: "用于 CAPI 请求的令牌",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* fb pixel */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Body 脚本",
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
    desc: "用于追踪 Instagram 活动转化和受众信号。",
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
        placeholder: "用于 API 请求的令牌",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* instagram */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Body 脚本",
        legacyName: "Script (Body)",
        placeholder: "<noscript>...</noscript>",
        inputType: "textarea",
      },
    ],
    sample: "<script>/* instagram tracking */</script>",
  },
  {
    id: "snapchat",
    title: "Snapchat Pixel",
    desc: "用于追踪 Snapchat Ads 广告转化。",
    fields: [
      {
        key: "pixelId",
        label: "Pixel ID",
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
        label: "头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* snap pixel */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Body 脚本",
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
    desc: "用于追踪 GA4 与 Google Ads 的转化数据。",
    fields: [
      {
        key: "measurementId",
        label: "Measurement ID",
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
        label: "头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* gtag */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Body 脚本",
        legacyName: "Script (Body)",
        placeholder: "<noscript>...</noscript>",
        inputType: "textarea",
      },
    ],
    sample: "<script>/* gtag */</script>",
  },
  {
    id: "global",
    title: "全局追踪",
    desc: "用于配置不依赖具体平台的通用追踪脚本。",
    fields: [
      {
        key: "headScript",
        label: "头部脚本",
        legacyName: "Script (Head)",
        placeholder: "<script>/* any */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Body 脚本",
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
      const value = typeof stableValue === "string"
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
  neutral: "border-neutral-800 bg-neutral-950/60 text-neutral-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  danger: "border-red-500/30 bg-red-500/10 text-red-200",
};

export default function TrackingSettings() {
  const defaultValues = useMemo(() => createDefaults(), []);
  const [values, setValues] = useState(defaultValues);
  const [savedAt, setSavedAt] = useState("");
  const [status, setStatus] = useState({
    tone: "neutral",
    message: "正在加载追踪设置...",
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
          const serverUpdatedAt = typeof response.data.config.updatedAt === "string"
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
              message: "已使用较新的本地追踪草稿。点击保存后会同步到服务器。",
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
            message: "已从服务器载入追踪设置。",
          });
          setHydrating(false);
          return;
        }

        if (response.status === 401 || response.status === 403) {
          setReadOnly(true);
          setDirty(false);
          setStatus({
            tone: "warning",
            message: "当前账号没有编辑或同步追踪设置的权限，页面已切为只读。",
          });
          setHydrating(false);
          return;
        }

        setStatus({
          tone: "danger",
          message: response.error || "服务器追踪设置加载失败，当前仍可使用本地草稿。",
        });
      } catch {
        if (!mounted) {
          return;
        }
        setStatus({
          tone: "danger",
          message: "服务器追踪设置加载失败，当前仍可使用本地草稿。",
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
        const syncedAt = typeof response.data.config.updatedAt === "string"
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

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">追踪设置</h1>
            <p className="mt-2 text-sm text-neutral-400">
              在这里配置各平台脚本、API 令牌和 Pixel 标识。点击统一保存后，会先把当前草稿保存到本地，再在有权限时同步到后端。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-300">
                {readOnly ? "只读模式" : dirty ? "有未同步修改" : "草稿已同步"}
              </span>
              <span className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-400">
                {savedAt ? `最近保存时间：${savedAt}` : "尚未保存"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={hydrating || saving || readOnly || !dirty}
            className="rounded-full border border-neutral-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "正在保存全部修改..." : "保存全部修改"}
          </button>
        </div>

        <div
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${STATUS_STYLES[status.tone] || STATUS_STYLES.neutral}`}
        >
          {status.message}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {TRACKING_GROUPS.map((group) => (
          <div
            key={group.id}
            className="space-y-4 rounded-2xl border border-neutral-900 bg-neutral-900/40 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{group.title}</h2>
                <p className="mt-1 text-xs leading-6 text-neutral-400">{group.desc}</p>
              </div>
              <span className="rounded-full border border-neutral-800 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                {group.fields.length} 个字段
              </span>
            </div>

            <div className="space-y-3">
              {group.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs text-neutral-500">{field.label}</label>
                  {field.inputType === "textarea" ? (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder}
                      value={values[group.id]?.[field.key] || ""}
                      onChange={(event) => handleChange(group.id, field.key, event.target.value)}
                      disabled={readOnly || hydrating}
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={values[group.id]?.[field.key] || ""}
                      onChange={(event) => handleChange(group.id, field.key, event.target.value)}
                      disabled={readOnly || hydrating}
                      className="w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-[10px] text-neutral-400">
              {group.sample}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
