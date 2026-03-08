"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGet as apiGet, adminPost as apiPost } from "../../lib/adminApiClient";

const TRACKING_GROUPS = [
  {
    id: "facebook",
    title: "Facebook Pixel",
    desc: "Track conversions and ad attribution for Facebook.",
    fields: [
      { name: "Pixel ID", placeholder: "e.g. 1234567890" },
      { name: "Access Token", placeholder: "Token for CAPI requests" },
      { name: "Script (Head)", placeholder: "<script>/* fb pixel */</script>" },
      { name: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* facebook pixel */</script>",
  },
  {
    id: "instagram",
    title: "Instagram",
    desc: "Track campaign conversions and audience signals.",
    fields: [
      { name: "Business ID", placeholder: "e.g. IG-BIZ-XXXX" },
      { name: "Access Token", placeholder: "Token for API requests" },
      { name: "Script (Head)", placeholder: "<script>/* instagram */</script>" },
      { name: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* instagram tracking */</script>",
  },
  {
    id: "snapchat",
    title: "Snapchat Pixel",
    desc: "Track Snapchat Ads conversions.",
    fields: [
      { name: "Pixel ID", placeholder: "e.g. SNAP-PIXEL-XXXX" },
      { name: "API Token", placeholder: "Token for conversion API" },
      { name: "Script (Head)", placeholder: "<script>/* snap pixel */</script>" },
      { name: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* snapchat pixel */</script>",
  },
  {
    id: "google",
    title: "Google Analytics / Ads",
    desc: "Track conversions for GA4 and Google Ads.",
    fields: [
      { name: "Measurement ID", placeholder: "e.g. G-XXXXXXX" },
      { name: "Ads Conversion ID", placeholder: "e.g. AW-XXXXXXX" },
      { name: "Script (Head)", placeholder: "<script>/* gtag */</script>" },
      { name: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* gtag */</script>",
  },
  {
    id: "global",
    title: "Global Tracking",
    desc: "Platform-agnostic tracking scripts.",
    fields: [
      { name: "Script (Head)", placeholder: "<script>/* any */</script>" },
      { name: "Script (Body)", placeholder: "<noscript>...</noscript>" },
    ],
    sample: "<script>/* custom */</script>",
  },
];

const STORAGE_KEY = "mn_tracking_settings_v1";

function createDefaults() {
  const defaults = {};
  TRACKING_GROUPS.forEach((group) => {
    defaults[group.id] = {};
    group.fields.forEach((field) => {
      defaults[group.id][field.name] = "";
    });
  });
  return defaults;
}

function normalizeValues(input, defaults) {
  const next = JSON.parse(JSON.stringify(defaults));
  if (!input || typeof input !== "object") {
    return next;
  }
  TRACKING_GROUPS.forEach((group) => {
    const groupValues =
      input[group.id] && typeof input[group.id] === "object" ? input[group.id] : {};
    group.fields.forEach((field) => {
      const value = groupValues[field.name];
      if (typeof value === "string") {
        next[group.id][field.name] = value;
      }
    });
  });
  return next;
}

export default function TrackingSettings() {
  const defaultValues = useMemo(() => createDefaults(), []);
  const [values, setValues] = useState(defaultValues);
  const [savedAt, setSavedAt] = useState("");
  const [serverStatus, setServerStatus] = useState("");
  const [saving, setSaving] = useState(false);

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
      setValues(normalizeValues(parsed?.values, defaultValues));
      if (typeof parsed?.savedAt === "string") {
        setSavedAt(parsed.savedAt);
      }
    } catch {
      // ignore parse errors
    }
  }, [defaultValues]);

  useEffect(() => {
    let mounted = true;
    apiGet("/api/admin/tracking").then((response) => {
      if (!mounted) {
        return;
      }
      if (response.ok && response.data?.config?.values) {
        setValues(normalizeValues(response.data.config.values, defaultValues));
        if (response.data.config.updatedAt) {
          setSavedAt(response.data.config.updatedAt);
        }
        setServerStatus("Loaded tracking settings from server.");
      } else if (response.status === 403) {
        setServerStatus("You do not have permission to view server tracking settings.");
      }
    });
    return () => {
      mounted = false;
    };
  }, [defaultValues]);

  const handleChange = (groupId, fieldName, nextValue) => {
    setValues((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        [fieldName]: nextValue,
      },
    }));
  };

  const handleSave = async () => {
    if (typeof window === "undefined") {
      return;
    }
    setSaving(true);
    const timestamp = new Date().toISOString();
    const payload = { savedAt: timestamp, values };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event("tracking:reload"));
    setSavedAt(timestamp);

    const response = await apiPost("/api/admin/tracking", { values });
    if (response.ok && response.data?.config?.updatedAt) {
      setSavedAt(response.data.config.updatedAt);
      setServerStatus("Saved to server.");
    } else if (!response.ok) {
      setServerStatus(response.error || "Server save failed. Settings are still saved locally.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6">
        <h1 className="text-2xl font-semibold">Tracking Settings</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Configure platform scripts, API tokens, and pixel IDs. Changes are saved locally and
          synced to the backend when available.
        </p>
        <p className="mt-2 text-xs text-neutral-500">{serverStatus}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {TRACKING_GROUPS.map((group) => (
          <div
            key={group.id}
            className="space-y-4 rounded-2xl border border-neutral-900 bg-neutral-900/40 p-5"
          >
            <div>
              <h2 className="text-lg font-semibold">{group.title}</h2>
              <p className="mt-1 text-xs text-neutral-400">{group.desc}</p>
            </div>
            <div className="space-y-3">
              {group.fields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <label className="text-xs text-neutral-500">{field.name}</label>
                  {field.name.includes("Script") ? (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder}
                      value={values[group.id]?.[field.name] || ""}
                      onChange={(event) =>
                        handleChange(group.id, field.name, event.target.value)
                      }
                      className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-200"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={values[group.id]?.[field.name] || ""}
                      onChange={(event) =>
                        handleChange(group.id, field.name, event.target.value)
                      }
                      className="w-full rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-200"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-[10px] text-neutral-400">
              {group.sample}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-full border border-neutral-700 px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
        ))}
      </section>

      <div className="text-xs text-neutral-500">
        {savedAt ? `Last saved: ${savedAt}` : "Not saved yet"}
      </div>
    </div>
  );
}
