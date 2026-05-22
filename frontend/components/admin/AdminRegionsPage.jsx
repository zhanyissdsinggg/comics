"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AdminFeedbackBanner } from "@/components/admin/common/AdminFeedbackBanner";
import {
  AdminFormField,
  AdminPageSection,
  adminInputClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
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
  const source = Array.isArray(values)
    ? values
    : String(values || "").split(",");

  return [
    ...new Set(
      source
        .map((value) => Number(String(value).trim()))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ].sort((left, right) => left - right);
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
  const normalizedCountryCodes = normalizeCountryCodes(countryCodes).filter(
    (item) => item.code,
  );
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
    return `国际区号不能重复：${duplicates.join(", ")}。`;
  }

  return "";
}

export default function AdminRegionsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const importInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [countryCodes, setCountryCodes] = useState([]);
  const [lengthRules, setLengthRules] = useState({});
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const loadData = useCallback(async () => {
    setLoading(true);

    const response = await adminGet("/api/admin/regions");
    if (response.ok) {
      const payload = buildPayload(
        response.data?.config?.countryCodes,
        response.data?.config?.lengthRules,
      );
      setCountryCodes(payload.countryCodes);
      setLengthRules(payload.lengthRules);
      setFeedback({ type: "", message: "" });
    } else {
      setFeedback({
        type: "error",
        message: response.error || response.message || "地区设置加载失败。",
      });
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
      }),
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
    setCountryCodes((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
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
      setFeedback({ type: "error", message: validationError });
      return;
    }

    setSaving(true);
    setFeedback({ type: "", message: "" });

    const payload = buildPayload(countryCodes, lengthRules);
    const response = await adminPost("/api/admin/regions", payload);

    if (response.ok) {
      const nextPayload = buildPayload(
        response.data?.config?.countryCodes,
        response.data?.config?.lengthRules,
      );
      setCountryCodes(nextPayload.countryCodes);
      setLengthRules(nextPayload.lengthRules);
      setFeedback({ type: "success", message: "地区设置已保存。" });
    } else {
      setFeedback({
        type: "error",
        message: response.error || response.message || "地区设置保存失败。",
      });
    }

    setSaving(false);
  };

  const handleExport = () => {
    const payload = buildPayload(countryCodes, lengthRules);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "地区规则配置.json";
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
        setFeedback({ type: "error", message: validationError });
        return;
      }

      const payload = buildPayload(parsed?.countryCodes, parsed?.lengthRules);
      setCountryCodes(payload.countryCodes);
      setLengthRules(payload.lengthRules);
      setFeedback({
        type: "success",
        message: "地区设置已导入，保存后生效。",
      });
    } catch {
      setFeedback({
        type: "error",
        message: "导入失败，请上传有效的 JSON 配置文件。",
      });
    } finally {
      event.target.value = "";
    }
  };

  if (isLoading || loading) {
    return (
      <AdminPageSection title="地区设置" description="正在读取地区规则。">
        <p className="text-sm text-slate-500">正在加载地区设置...</p>
      </AdminPageSection>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminPageSection title="地区设置" description="需要先登录后台。">
        <p className="text-sm text-slate-500">请先登录后台后再管理地区设置。</p>
      </AdminPageSection>
    );
  }

  return (
    <div className="space-y-6">
      <AdminFeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback({ type: "", message: "" })}
      />

      <AdminPageSection
        title="手机号码规则"
        description="维护国际区号和本地号码长度。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => importInputRef.current?.click()}
            >
              导入配置
            </Button>
            <Button type="button" variant="outline" onClick={handleExport}>
              导出配置
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              data-testid="admin-regions-save"
            >
              {saving ? "保存中..." : "保存更改"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.035)] ring-1 ring-black/[0.02]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">
                  国际区号
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  每一条只保留区号和显示名称。
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={addCode}
                data-testid="admin-regions-add-entry"
              >
                新增条目
              </Button>
            </div>

            {countryCodes.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-white p-6 text-sm text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.025)]">
                还没有添加任何国际区号。
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {countryCodes.map((item, index) => (
                  <div
                    key={`${item.code || "new"}-${index}`}
                    className="grid gap-3 rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015] md:grid-cols-[130px_minmax(0,1fr)_auto] md:items-end"
                  >
                    <AdminFormField label="区号">
                      <input
                        value={item.code}
                        onChange={(event) =>
                          updateCode(index, "code", event.target.value)
                        }
                        className={adminInputClassName}
                        placeholder="+1"
                      />
                    </AdminFormField>

                    <AdminFormField label="地区名称">
                      <input
                        value={item.label}
                        onChange={(event) =>
                          updateCode(index, "label", event.target.value)
                        }
                        className={adminInputClassName}
                        placeholder="美国"
                      />
                    </AdminFormField>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeCode(index)}
                    >
                      删除
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.035)] ring-1 ring-black/[0.02]">
            <div>
              <h3 className="text-base font-semibold text-slate-950">
                本地号码长度
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                多个长度用逗号分隔，例如 <code>10</code> 或 <code>9,10,11</code>
                。
              </p>
            </div>

            {countryCodes.filter((item) => normalizeDialCode(item.code))
              .length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-[color:var(--gush-border)] bg-white p-6 text-sm text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.025)]">
                请先添加至少一个国际区号，再填写长度规则。
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {countryCodes
                  .map((item) => ({
                    ...item,
                    code: normalizeDialCode(item.code),
                  }))
                  .filter((item) => item.code)
                  .map((item, index) => (
                    <label
                      key={`${item.code}-${index}`}
                      className="grid gap-2 rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015] md:grid-cols-[110px_minmax(0,1fr)] md:items-center"
                    >
                      <span className="text-sm font-semibold text-slate-700">
                        {item.code}
                      </span>
                      <input
                        value={(lengthRules[item.code] || []).join(",")}
                        onChange={(event) =>
                          updateRule(item.code, event.target.value)
                        }
                        className={adminInputClassName}
                        placeholder="10"
                      />
                    </label>
                  ))}
              </div>
            )}
          </div>
        </div>
      </AdminPageSection>
    </div>
  );
}
