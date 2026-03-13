"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "./AuthContext";
import { adminGet, adminPost } from "../../lib/adminApiClient";

function normalizeDialCode(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return trimmed;
  }

  return `+${digits}`;
}

function normalizeCountryCodes(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    code: normalizeDialCode(item?.code),
    label: String(item?.label || "").trim(),
  }));
}

function normalizeLengthValues(values) {
  const source = Array.isArray(values) ? values : String(values || "").split(",");

  return [...new Set(
    source
      .map((value) => Number(String(value).trim()))
      .filter((value) => Number.isInteger(value) && value > 0)
  )].sort((left, right) => left - right);
}

function findDuplicateCountryCodes(items) {
  const duplicates = new Set();
  const seen = new Set();

  normalizeCountryCodes(items)
    .filter((item) => item.code)
    .forEach((item) => {
      if (seen.has(item.code)) {
        duplicates.add(item.code);
        return;
      }

      seen.add(item.code);
    });

  return [...duplicates];
}

function buildPayload(countryCodes, lengthRules) {
  const normalizedCountryCodes = normalizeCountryCodes(countryCodes).filter((item) => item.code);
  const allowedCodes = new Set(normalizedCountryCodes.map((item) => item.code));
  const normalizedRules = {};

  Object.entries(lengthRules || {}).forEach(([code, values]) => {
    const normalizedCode = normalizeDialCode(code);
    if (!normalizedCode || !allowedCodes.has(normalizedCode)) {
      return;
    }

    const normalizedValues = normalizeLengthValues(values);
    if (normalizedValues.length > 0) {
      normalizedRules[normalizedCode] = normalizedValues;
    }
  });

  return {
    countryCodes: normalizedCountryCodes,
    lengthRules: normalizedRules,
  };
}

function getRegionValidationError(countryCodes) {
  const duplicates = findDuplicateCountryCodes(countryCodes);
  if (duplicates.length > 0) {
    return `国家区号不能重复：${duplicates.join(", ")}。`;
  }

  return "";
}

function StatusBanner({ state }) {
  if (!state?.message) {
    return null;
  }

  const className =
    state.tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${className}`}>{state.message}</div>;
}

export default function AdminRegionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countryCodes, setCountryCodes] = useState([]);
  const [lengthRules, setLengthRules] = useState({});
  const [status, setStatus] = useState({ tone: "success", message: "" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);

    const response = await adminGet("/api/admin/regions");
    if (response.ok) {
      const payload = buildPayload(response.data?.config?.countryCodes, response.data?.config?.lengthRules);
      setCountryCodes(payload.countryCodes);
      setLengthRules(payload.lengthRules);
      setStatus({ tone: "success", message: "" });
    } else {
      setStatus({ tone: "error", message: response.error || response.message || "地区配置加载失败。" });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      return;
    }

    if (!isLoading) {
      setLoading(false);
    }
  }, [isAuthenticated, isLoading, loadData]);

  const updateCode = (index, field, value) => {
    const previousCode = normalizeDialCode(countryCodes[index]?.code || "");

    setCountryCodes((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === "code") {
          return { ...item, code: value };
        }

        return { ...item, [field]: value };
      })
    );

    if (field === "code") {
      const nextCode = normalizeDialCode(value);
      if (previousCode !== nextCode) {
        setLengthRules((current) => {
          const next = { ...current };
          const previousValues = next[previousCode];
          delete next[previousCode];
          if (nextCode && previousValues?.length) {
            next[nextCode] = previousValues;
          }
          return next;
        });
      }
    }
  };

  const addCode = () => {
    setCountryCodes((current) => [...current, { code: "", label: "" }]);
  };

  const removeCode = (index) => {
    const code = normalizeDialCode(countryCodes[index]?.code || "");
    setCountryCodes((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setLengthRules((current) => {
      if (!code) {
        return current;
      }
      const next = { ...current };
      delete next[code];
      return next;
    });
  };

  const updateRule = (code, value) => {
    const normalizedCode = normalizeDialCode(code);
    if (!normalizedCode) {
      return;
    }

    setLengthRules((current) => ({
      ...current,
      [normalizedCode]: normalizeLengthValues(value),
    }));
  };

  const handleSave = async () => {
    const validationError = getRegionValidationError(countryCodes);
    if (validationError) {
      setStatus({ tone: "error", message: validationError });
      return;
    }

    setSaving(true);
    setStatus({ tone: "success", message: "" });

    const payload = buildPayload(countryCodes, lengthRules);
    const response = await adminPost("/api/admin/regions", payload);

    if (response.ok) {
      const nextPayload = buildPayload(response.data?.config?.countryCodes, response.data?.config?.lengthRules);
      setCountryCodes(nextPayload.countryCodes);
      setLengthRules(nextPayload.lengthRules);
      setStatus({ tone: "success", message: "地区配置已保存。" });
    } else {
      setStatus({ tone: "error", message: response.error || response.message || "地区配置保存失败。" });
    }

    setSaving(false);
  };

  const handleExport = () => {
    const payload = buildPayload(countryCodes, lengthRules);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "region-config.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validationError = getRegionValidationError(parsed?.countryCodes);
      if (validationError) {
        setStatus({ tone: "error", message: validationError });
        return;
      }

      const payload = buildPayload(parsed?.countryCodes, parsed?.lengthRules);
      setCountryCodes(payload.countryCodes);
      setLengthRules(payload.lengthRules);
      setStatus({ tone: "success", message: "配置已导入，请保存后生效。" });
    } catch {
      setStatus({ tone: "error", message: "导入失败，请提供有效的 JSON 文件。" });
    } finally {
      event.target.value = "";
    }
  };

  if (isLoading || loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">正在加载地区配置...</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        需要管理员权限，请重新登录后刷新页面。
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">地区配置</h2>
          <p className="text-sm text-slate-500">
            管理 OTP 与账号流程使用的手机号国家区号和本地号码长度规则。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            导入 JSON
            <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            导出 JSON
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存更改"}
          </button>
        </div>
      </div>

      <StatusBanner state={status} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">国家区号</h3>
              <p className="text-xs text-slate-500">定义前台区号选择器使用的拨号前缀和展示名称。</p>
            </div>
            <button
              type="button"
              onClick={addCode}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              新增条目
            </button>
          </div>

          {countryCodes.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              还没有配置任何国家区号。
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {countryCodes.map((item, index) => (
                <div key={`${item.code || "new"}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[120px,1fr,auto] md:items-center">
                  <input
                    value={item.code}
                    onChange={(event) => updateCode(index, "code", event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    placeholder="+1"
                  />
                  <input
                    value={item.label}
                    onChange={(event) => updateCode(index, "label", event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                    placeholder="美国"
                  />
                  <button
                    type="button"
                    onClick={() => removeCode(index)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">手机号长度规则</h3>
            <p className="text-xs text-slate-500">输入以逗号分隔的数字，例如 `10` 或 `9,10,11`。</p>
          </div>

          {countryCodes.filter((item) => normalizeDialCode(item.code)).length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              请先至少添加一个国家区号，再设置长度规则。
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {countryCodes
                .map((item) => ({ ...item, code: normalizeDialCode(item.code) }))
                .filter((item) => item.code)
                .map((item, index) => (
                  <label key={`${item.code}-${index}`} className="grid gap-2 md:grid-cols-[110px,1fr] md:items-center">
                    <span className="text-sm font-semibold text-slate-700">{item.code}</span>
                    <input
                      value={(lengthRules[item.code] || []).join(",")}
                      onChange={(event) => updateRule(item.code, event.target.value)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                      placeholder="10"
                    />
                  </label>
                ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
