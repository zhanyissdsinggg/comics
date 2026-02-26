"use client";

import { useState } from "react";

/**
 * 老王注释：高级搜索过滤组件 - 支持多条件搜索、日期范围、状态过滤等
 * 这个SB组件让用户能快速找到他们需要的数据，提高工作效率
 */
export function AdvancedFilter({
  onFilter = null,
  filters = [],
  loading = false,
}) {
  const [filterValues, setFilterValues] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 老王说：处理过滤值变化
  const handleFilterChange = (filterId, value) => {
    const newValues = {
      ...filterValues,
      [filterId]: value,
    };
    setFilterValues(newValues);
  };

  // 老王说：应用过滤
  const handleApplyFilter = () => {
    if (onFilter) {
      onFilter(filterValues);
    }
  };

  // 老王说：重置过滤
  const handleResetFilter = () => {
    setFilterValues({});
    if (onFilter) {
      onFilter({});
    }
  };

  // 老王说：检查是否有活跃的过滤
  const hasActiveFilters = Object.values(filterValues).some((v) => v !== "" && v !== null);

  return (
    <div className="space-y-4 mb-6">
      {/* 老王说：简单搜索栏 */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="搜索..."
            value={filterValues.search || ""}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleApplyFilter();
              }
            }}
            className="w-full px-4 py-2 rounded border border-white/10 bg-neutral-900/50 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
          />
          <span className="absolute right-3 top-2.5 text-neutral-500">🔍</span>
        </div>

        {/* 老王说：高级过滤按钮 */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2 rounded border border-white/10 bg-neutral-900/50 text-neutral-300 hover:bg-white/5 transition-colors"
        >
          ⚙️ 高级
        </button>

        {/* 老王说：应用过滤按钮 */}
        <button
          onClick={handleApplyFilter}
          disabled={loading}
          className="px-4 py-2 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "搜索中..." : "搜索"}
        </button>

        {/* 老王说：重置按钮 */}
        {hasActiveFilters && (
          <button
            onClick={handleResetFilter}
            className="px-4 py-2 rounded border border-white/10 bg-neutral-900/50 text-neutral-300 hover:bg-white/5 transition-colors"
          >
            ✕ 重置
          </button>
        )}
      </div>

      {/* 老王说：高级过滤面板 */}
      {showAdvanced && (
        <div className="p-4 rounded border border-white/10 bg-neutral-900/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.id} className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  {filter.label}
                </label>

                {/* 老王说：文本输入 */}
                {filter.type === "text" && (
                  <input
                    type="text"
                    placeholder={filter.placeholder}
                    value={filterValues[filter.id] || ""}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 rounded border border-white/10 bg-neutral-900/50 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 text-sm"
                  />
                )}

                {/* 老王说：选择框 */}
                {filter.type === "select" && (
                  <select
                    value={filterValues[filter.id] || ""}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full px-3 py-2 rounded border border-white/10 bg-neutral-900/50 text-white focus:outline-none focus:border-emerald-500/50 text-sm"
                  >
                    <option value="">全部</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* 老王说：日期范围 */}
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

                {/* 老王说：复选框 */}
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

          {/* 老王说：操作按钮 */}
          <div className="flex gap-2 justify-end pt-4 border-t border-white/10">
            <button
              onClick={() => setShowAdvanced(false)}
              className="px-4 py-2 rounded border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors text-sm"
            >
              关闭
            </button>
            <button
              onClick={handleResetFilter}
              className="px-4 py-2 rounded border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors text-sm"
            >
              重置
            </button>
            <button
              onClick={handleApplyFilter}
              disabled={loading}
              className="px-4 py-2 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading ? "搜索中..." : "应用过滤"}
            </button>
          </div>
        </div>
      )}

      {/* 老王说：活跃过滤标签 */}
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
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
