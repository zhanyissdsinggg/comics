"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGet as apiGet, adminPost as apiPost } from "../../lib/adminApiClient";

const TRACKING_GROUPS = [
  {
    id: "facebook",
    title: "Facebook Pixel",
    desc: "Track conversions and ad attribution for Facebook.",
    fields: [
      {
        key: "pixelId",
        label: "Pixel ID",
        legacyName: "Pixel ID",
        placeholder: "e.g. 1234567890",
        inputType: "text",
      },
      {
        key: "accessToken",
        label: "Access Token",
        legacyName: "Access Token",
        placeholder: "Token for CAPI requests",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "Script (Head)",
        legacyName: "Script (Head)",
        placeholder: "<script>/* fb pixel */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Script (Body)",
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
    desc: "Track campaign conversions and audience signals.",
    fields: [
      {
        key: "businessId",
        label: "Business ID",
        legacyName: "Business ID",
        placeholder: "e.g. IG-BIZ-XXXX",
        inputType: "text",
      },
      {
        key: "accessToken",
        label: "Access Token",
        legacyName: "Access Token",
        placeholder: "Token for API requests",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "Script (Head)",
        legacyName: "Script (Head)",
        placeholder: "<script>/* instagram */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Script (Body)",
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
    desc: "Track Snapchat Ads conversions.",
    fields: [
      {
        key: "pixelId",
        label: "Pixel ID",
        legacyName: "Pixel ID",
        placeholder: "e.g. SNAP-PIXEL-XXXX",
        inputType: "text",
      },
      {
        key: "apiToken",
        label: "API Token",
        legacyName: "API Token",
        placeholder: "Token for conversion API",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "Script (Head)",
        legacyName: "Script (Head)",
        placeholder: "<script>/* snap pixel */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Script (Body)",
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
    desc: "Track conversions for GA4 and Google Ads.",
    fields: [
      {
        key: "measurementId",
        label: "Measurement ID",
        legacyName: "Measurement ID",
        placeholder: "e.g. G-XXXXXXX",
        inputType: "text",
      },
      {
        key: "adsConversionId",
        label: "Ads Conversion ID",
        legacyName: "Ads Conversion ID",
        placeholder: "e.g. AW-XXXXXXX",
        inputType: "text",
      },
      {
        key: "headScript",
        label: "Script (Head)",
        legacyName: "Script (Head)",
        placeholder: "<script>/* gtag */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Script (Body)",
        legacyName: "Script (Body)",
        placeholder: "<noscript>...</noscript>",
        inputType: "textarea",
      },
    ],
    sample: "<script>/* gtag */</script>",
  },
  {
    id: "global",
    title: "Global Tracking",
    desc: "Platform-agnostic tracking scripts.",
    fields: [
      {
        key: "headScript",
        label: "Script (Head)",
        legacyName: "Script (Head)",
        placeholder: "<script>/* any */</script>",
        inputType: "textarea",
      },
      {
        key: "bodyScript",
        label: "Script (Body)",
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
    message: "Loading tracking settings...",
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
          message: "Loaded the local draft while checking the server copy.",
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
              message: "Using newer local tracking draft. Save to sync it to the server.",
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
            message: "Loaded tracking settings from the server.",
          });
          setHydrating(false);
          return;
        }

        if (response.status === 401 || response.status === 403) {
          setReadOnly(true);
          setDirty(false);
          setStatus({
            tone: "warning",
            message: "This account cannot edit or sync tracking settings. The page is now read-only.",
          });
          setHydrating(false);
          return;
        }

        setStatus({
          tone: "danger",
          message: response.error || "Failed to load server tracking settings. Local draft remains available.",
        });
      } catch {
        if (!mounted) {
          return;
        }
        setStatus({
          tone: "danger",
          message: "Failed to load server tracking settings. Local draft remains available.",
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
      message: "Draft changed. Save all changes to sync this version.",
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
      message: "Draft saved locally. Syncing to the server...",
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
          message: "Saved locally and synced to the server.",
        });
        return;
      }

      if (response.status === 401 || response.status === 403) {
        setReadOnly(true);
        setDirty(false);
        setStatus({
          tone: "warning",
          message: "Draft saved locally, but this account cannot sync tracking settings to the server.",
        });
        return;
      }

      setStatus({
        tone: "danger",
        message: response.error || "Server save failed. The draft is still saved locally.",
      });
    } catch {
      setStatus({
        tone: "danger",
        message: "Server save failed. The draft is still saved locally.",
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
            <h1 className="text-2xl font-semibold">Tracking Settings</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Configure platform scripts, API tokens, and pixel IDs. Use the global save action to store the current
              draft locally and sync it to the backend when permissions allow.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-300">
                {readOnly ? "Read-only" : dirty ? "Unsynced changes" : "Synced draft"}
              </span>
              <span className="rounded-full border border-neutral-800 px-3 py-1 text-neutral-400">
                {savedAt ? `Last saved: ${savedAt}` : "Not saved yet"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={hydrating || saving || readOnly || !dirty}
            className="rounded-full border border-neutral-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving all changes..." : "Save all changes"}
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
                {group.fields.length} fields
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
