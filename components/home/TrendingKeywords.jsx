import { memo } from "react";

/**
 * 老王注释：热门关键词组件，显示当前热门搜索词
 */
const TrendingKeywords = memo(function TrendingKeywords({ keywords, hotWindow, onWindowChange, onKeywordClick }) {
  if (!keywords || keywords.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-neutral-900 bg-neutral-900/40 p-4 text-xs text-neutral-300">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-neutral-500">Trending searches</p>
        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
          {["day", "week", "month"].map((windowKey) => (
            <button
              key={windowKey}
              type="button"
              onClick={() => onWindowChange(windowKey)}
              className={`rounded-full px-2 py-0.5 ${
                hotWindow === windowKey
                  ? "border border-neutral-700 text-neutral-200"
                  : "border border-transparent text-neutral-500"
              }`}
            >
              {windowKey === "day" ? "Today" : windowKey}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {keywords.slice(0, 8).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onKeywordClick(item)}
            className="rounded-full border border-neutral-800 px-3 py-1 text-xs text-neutral-300"
          >
            {item}
          </button>
        ))}
      </div>
    </section>
  );
});

export default TrendingKeywords;
