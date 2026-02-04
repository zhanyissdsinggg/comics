"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiGet, apiPost } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

export default function AdminRegionsPage() {
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const isAuthorized = key === ADMIN_KEY;
  const [loading, setLoading] = useState(true);
  const [countryCodes, setCountryCodes] = useState([]);
  const [lengthRules, setLengthRules] = useState({});
  const [status, setStatus] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/regions?key=${key}`);
    if (response.ok && response.data?.config) {
      setCountryCodes(response.data.config.countryCodes || []);
      setLengthRules(response.data.config.lengthRules || {});
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadData]);

  const updateCode = (index, field, value) => {
    setCountryCodes((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const addCode = () => {
    setCountryCodes((prev) => [...prev, { code: "", label: "" }]);
  };

  const removeCode = (index) => {
    setCountryCodes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateRule = (code, value) => {
    setLengthRules((prev) => ({
      ...prev,
      [code]: value
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((num) => Number.isFinite(num) && num > 0),
    }));
  };

  const handleSave = async () => {
    setStatus("");
    const payload = { key, countryCodes, lengthRules };
    const response = await apiPost("/api/admin/regions", payload);
    if (response.ok) {
      setStatus("已保存");
    } else {
      setStatus(response.error || "保存失败");
    }
  };

  const handleExport = () => {
    const payload = { countryCodes, lengthRules };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "region-config.json";
    link.click();
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
      const nextCountryCodes = Array.isArray(parsed?.countryCodes) ? parsed.countryCodes : [];
      const nextLengthRules = parsed?.lengthRules || {};
      setCountryCodes(nextCountryCodes);
      setLengthRules(nextLengthRules);
      setStatus("已导入，请记得保存");
    } catch (err) {
      setStatus("导入失败，JSON格式不正确");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <AdminShell
      title="区号配置"
      subtitle="管理短信区号与号码长度规则"
      actions={
        isAuthorized ? (
          <div className="flex items-center gap-2">
            <label className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">
              导入JSON
              <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
            >
              导出JSON
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            >
              保存配置
            </button>
          </div>
        ) : null
      }
    >
      {!isAuthorized ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          403 无权限，请在地址栏附加 ?key=ADMIN_KEY
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-slate-400">
          加载中...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">国家区号</h3>
              <button
                type="button"
                onClick={addCode}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                新增
              </button>
            </div>
            {countryCodes.length === 0 ? (
              <div className="text-xs text-slate-500">暂无区号</div>
            ) : (
              <div className="space-y-2">
                {countryCodes.map((item, index) => (
                  <div key={`${item.code}-${index}`} className="flex items-center gap-2">
                    <input
                      value={item.code}
                      onChange={(event) => updateCode(index, "code", event.target.value)}
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="+1"
                    />
                    <input
                      value={item.label}
                      onChange={(event) => updateCode(index, "label", event.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="US"
                    />
                    <button
                      type="button"
                      onClick={() => removeCode(index)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">号码长度规则</h3>
            <p className="text-xs text-slate-400">格式：10 或 9,10,11</p>
            <div className="space-y-2">
              {countryCodes.map((item) => (
                <div key={item.code} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-slate-500">{item.code}</div>
                  <input
                    value={(lengthRules[item.code] || []).join(",")}
                    onChange={(event) => updateRule(item.code, event.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="10"
                  />
                </div>
              ))}
            </div>
          </div>

          {status ? <div className="text-xs text-emerald-600">{status}</div> : null}
        </div>
      )}
    </AdminShell>
  );
}
