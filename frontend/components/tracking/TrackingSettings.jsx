"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "../../lib/apiClient";

const TRACKING_ITEMS = [
  {
    id: "facebook",
    title: "Facebook Pixel",
    desc: "用于转化追踪与广告归因。",
    fields: [
      { label: "Pixel ID", placeholder: "例如 1234567890" },
      { label: "Access Token", placeholder: "用于 CAPI 的 token" },
      { label: "Script (Head)", placeholder: "<script>/* fb pixel */</script>" },
      { label: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* facebook pixel */</script>",
  },
  {
    id: "instagram",
    title: "Instagram",
    desc: "用于广告转化与受众追踪。",
    fields: [
      { label: "Business ID", placeholder: "例如 IG-BIZ-XXXX" },
      { label: "Access Token", placeholder: "用于 API 的 token" },
      { label: "Script (Head)", placeholder: "<script>/* ig */</script>" },
      { label: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* instagram tracking */</script>",
  },
  {
    id: "snapchat",
    title: "Snapchat Pixel",
    desc: "用于 Snapchat Ads 转化统计。",
    fields: [
      { label: "Pixel ID", placeholder: "例如 SNAP-PIXEL-XXXX" },
      { label: "API Token", placeholder: "用于转化 API" },
      { label: "Script (Head)", placeholder: "<script>/* snap pixel */</script>" },
      { label: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* snapchat pixel */</script>",
  },
  {
    id: "google",
    title: "Google Analytics / Ads",
    desc: "GA4 / Ads 转化追踪。",
    fields: [
      { label: "Measurement ID", placeholder: "例如 G-XXXXXXX" },
      { label: "Ads Conversion ID", placeholder: "例如 AW-XXXXXXX" },
      { label: "Script (Head)", placeholder: "<script>/* gtag */</script>" },
      { label: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* gtag */</script>",
  },
  {
    id: "global",
    title: "全局追踪",
    desc: "不绑定平台的通用追踪脚本。",
    fields: [
      { label: "Script (Head)", placeholder: "<script>/* any */</script>" },
      { label: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* custom */</script>",
  },
];

const STORAGE_KEY = "mn_tracking_settings_v1";

function buildDefaults() {
  const defaults = {};
  TRACKING_ITEMS.forEach((item) => {
    defaults[item.id] = {};
    item.fields.forEach((field) => {
      defaults[item.id][field.label] = "";
    });
  });
  return defaults;
}

export default function TrackingSettings() {
  const searchParams = useSearchParams();
  const key = searchParams?.get("key") || "";
  const defaultValues = useMemo(() => buildDefaults(), []);
  const [values, setValues] = useState(defaultValues);
  const [savedAt, setSavedAt] = useState("");
  const [serverStatus, setServerStatus] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.values) {
        setValues((prev) => ({ ...prev, ...parsed.values }));
      }
      if (parsed?.savedAt) {
        setSavedAt(parsed.savedAt);
      }
    } catch (err) {
      // ignore parse errors
    }
  }, [defaultValues]);

  useEffect(() => {
    let mounted = true;
    apiGet(`/api/admin/tracking?key=${encodeURIComponent(key)}`).then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok && response.data?.config?.values) {
        setValues((prev) => ({ ...prev, ...response.data.config.values }));
        if (response.data.config.updatedAt) {
          setSavedAt(response.data.config.updatedAt);
        }
        setServerStatus("已从服务器加载");
      } else if (response.status === 403) {
        setServerStatus("无权限访问服务器配置");
      }
    });
    return () => {
      mounted = false;
    };
  }, [key]);

  const handleChange = (groupId, label, nextValue) => {
    setValues((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        [label]: nextValue,
      },
    }));
  };

  const handleSave = async () => {
    if (typeof window === "undefined") {
      return;
    }
    const timestamp = new Date().toISOString();
    const payload = { savedAt: timestamp, values };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event("tracking:reload"));
    setSavedAt(timestamp);
    const response = await apiPost("/api/admin/tracking", { key, values });
    if (response.ok && response.data?.config?.updatedAt) {
      setSavedAt(response.data.config.updatedAt);
      setServerStatus("已保存到服务器");
    } else if (!response.ok) {
      setServerStatus(response.error || "服务器保存失败");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6">
        <h1 className="text-2xl font-semibold">追踪设置</h1>
        <p className="mt-2 text-sm text-neutral-400">
          在这里保存各平台追踪代码、API Key 与像素 ID。保存后立即注入到前端页面。
        </p>
        <p className="mt-2 text-xs text-neutral-500">{serverStatus}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {TRACKING_ITEMS.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-5 space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-1 text-xs text-neutral-400">{item.desc}</p>
            </div>
            <div className="space-y-3">
              {item.fields.map((field) => (
                <div key={field.label} className="space-y-1">
                  <label className="text-xs text-neutral-500">{field.label}</label>
                  {field.label.includes("Script") ? (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder}
                      value={values[item.id]?.[field.label] || ""}
                      onChange={(event) =>
                        handleChange(item.id, field.label, event.target.value)
                      }
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-200"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={values[item.id]?.[field.label] || ""}
                      onChange={(event) =>
                        handleChange(item.id, field.label, event.target.value)
                      }
                      className="w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-200"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-[10px] text-neutral-400">
              {item.sample}
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="w-full rounded-full border border-neutral-700 px-4 py-2 text-xs"
            >
              保存到本地
            </button>
          </div>
        ))}
      </section>
      <div className="text-xs text-neutral-500">
        {savedAt ? `最近保存：${savedAt}` : "尚未保存"}
      </div>
    </div>
  );
}
