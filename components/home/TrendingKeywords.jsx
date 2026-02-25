import { memo } from "react";

/**
 * 老王注释：热门关键词组件，显示当前热门搜索词
 */
const TrendingKeywords = memo(function TrendingKeywords({ keywords, hotWindow, onWindowChange, onKeywordClick }) {
  if (!keywords || keywords.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl bg-neutral-900/50 border border-neutral-800 p-4">
      {/* 老王优化：北美风格的清晰标题 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Trending Now</h2>
        <div className="flex items-center gap-1.5 text-xs">
          {["day", "week", "month"].map((windowKey) => (
            <button
              key={windowKey}
              type="button"
              onClick={() => onWindowChange(windowKey)}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                hotWindow === windowKey
                  ? "bg-emerald-500 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300"
              }`}
            >
              {windowKey === "day" ? "Today" : windowKey}
            </button>
          ))}
        </div>
      </div>

      {/* 老王优化：更清晰的关键词标签 */}
      <div className="flex flex-wrap gap-2">
        {keywords.slice(0, 8).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onKeywordClick(item)}
            className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
});

export default TrendingKeywords;
