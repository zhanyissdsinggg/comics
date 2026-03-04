"use client";

import { useState } from "react";

/**
 * 鑰佺帇娉ㄩ噴锛氶珮绾ф悳绱㈣繃婊ょ粍浠?- 鏀寔澶氭潯浠舵悳绱€佹棩鏈熻寖鍥淬€佺姸鎬佽繃婊ょ瓑
 * 杩欎釜SB缁勪欢璁╃敤鎴疯兘蹇€熸壘鍒颁粬浠渶瑕佺殑鏁版嵁锛屾彁楂樺伐浣滄晥鐜? */
export function AdvancedFilter({
  onFilter = null,
  filters = [],
  loading = false,
}) {
  const [filterValues, setFilterValues] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 鑰佺帇璇达細澶勭悊杩囨护鍊煎彉鍖?
  const handleFilterChange = (filterId, value) => {
    const newValues = {
      ...filterValues,
      [filterId]: value,
    };
    setFilterValues(newValues);
  };

  // 鑰佺帇璇达細搴旂敤杩囨护
  const handleApplyFilter = () => {
    if (onFilter) {
      onFilter(filterValues);
    }
  };

  // 鑰佺帇璇达細閲嶇疆杩囨护
  const handleResetFilter = () => {
    setFilterValues({});
    if (onFilter) {
      onFilter({});
    }
  };

  // 鑰佺帇璇达細妫€鏌ユ槸鍚︽湁娲昏穬鐨勮繃婊?
  const hasActiveFilters = Object.values(filterValues).some((v) => v !== "" && v !== null);

  return (
    <div className="space-y-4 mb-6">
      {/* 鑰佺帇璇达細绠€鍗曟悳绱㈡爮 */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="鎼滅储..."
            value={filterValues.search || ""}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleApplyFilter();
              }
            }}
            className="w-full px-4 py-2 rounded border border-white/10 bg-neutral-900/50 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
          />
          <span className="absolute right-3 top-2.5 text-neutral-500">馃攳</span>
        </div>

        {/* 鑰佺帇璇达細楂樼骇杩囨护鎸夐挳 */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 rounded border border-white/10 bg-neutral-900/50 text-neutral-300 hover:bg-white/5 transition-colors"
        >
          鈿欙笍 楂樼骇
        </button>

        {/* 鑰佺帇璇达細搴旂敤杩囨护鎸夐挳 */}
        <button
          onClick={handleApplyFilter}
          disabled={loading}
          className="px-4 py-2 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "鎼滅储涓?.." : "鎼滅储"}
        </button>

        {/* 鑰佺帇璇达細閲嶇疆鎸夐挳 */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilter}
            className="px-4 py-2 rounded border border-white/10 bg-neutral-900/50 text-neutral-300 hover:bg-white/5 transition-colors"
          >
            鉁?閲嶇疆
          </button>
        )}
      </div>

      {/* 鑰佺帇璇达細楂樼骇杩囨护闈㈡澘 */}
      {showAdvanced && (
        <div className="p-4 rounded border border-white/10 bg-neutral-900/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  {filter.label}
                </label>

                {/* 鑰佺帇璇达細鏂囨湰杈撳叆 */}
                {filter.type === "text" && (
                  <input
                    type="text"
                    placeholder={filter.placeholder}
                    value={filterValues[filter.id] || ""}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 rounded border border-white/10 bg-neutral-900/50 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 text-sm"
                  />
                )}

                {/* 鑰佺帇璇达細閫夋嫨妗?*/}
                {filter.type === "select" && (
                  <select
                    value={filterValues[filter.id] || ""}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 rounded border border-white/10 bg-neutral-900/50 text-white focus:outline-none focus:border-emerald-500/50 text-sm"
                  >
                    <option value="">鍏ㄩ儴</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* 鑰佺帇璇达細鏃ユ湡鑼冨洿 */}
                {filter.type === "dateRange" && (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filterValues[`${filter.id}_start`] || ""}
                      onChange={(e) =>
                        handleFilterChange(`${filter.id}_start`, e.target.value)
                      }
                      className="flex-1 px-3 py-2 rounded border border-white/10 bg-neutral-900/50 text-white focus:outline-none focus:border-emerald-500/50 text-sm"
                    />
                    <input
                      type="date"
                      value={filterValues[`${filter.id}_end`] || ""}
                      onChange={(e) =>
                        handleFilterChange(`${filter.id}_end`, e.target.value)
                      }
                      className="flex-1 px-3 py-2 rounded border border-white/10 bg-neutral-900/50 text-white focus:outline-none focus:border-emerald-500/50 text-sm"
                    />
                  </div>
                )}

                {/* 鑰佺帇璇达細澶嶉€夋 */}
                {filter.type === "checkbox" && (
                  <div className="space-y-2">
                    {filter.options?.map((option) => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={
                            (filterValues[filter.id] || []).includes(option.value)
                          }
                          onChange={(e) => {
                            const current = filterValues[filter.id] || [];
                            const updated = e.target.checked
                              ? [...current, option.value]
                              : current.filter((v) => v !== option.value);
                            handleFilterChange(filter.id, updated);
                          }}
                          className="h-4 w-4 rounded border-white/20"
                        />
                        <span className="text-sm text-neutral-300">{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 鑰佺帇璇达細鎿嶄綔鎸夐挳 */}
          <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
            <button
              onClick={() => setShowAdvanced(false)}
              className="px-4 py-2 rounded border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors text-sm"
            >
              鍏抽棴
            </button>
            <button
              onClick={handleResetFilter}
              className="px-4 py-2 rounded border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors text-sm"
            >
              閲嶇疆
            </button>
            <button
              onClick={handleApplyFilter}
              disabled={loading}
              className="px-4 py-2 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading ? "鎼滅储涓?.." : "搴旂敤杩囨护"}
            </button>
          </div>
        </div>
      )}

      {/* 鑰佺帇璇达細娲昏穬杩囨护鏍囩 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filterValues).map(([key, value]) => {
            if (!value || value === "" || (Array.isArray(value) && value.length === 0)) {
              return null;
            }

            const displayValue = Array.isArray(value) ? value.join(", ") : value;

            return (
              <div
                key={key}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400"
              >
                <span>{displayValue}</span>
                <button
                  onClick={() => handleFilterChange(key, "")}
                  className="hover:text-emerald-300"
                >
                  鉁?                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}