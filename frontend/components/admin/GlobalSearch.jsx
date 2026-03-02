/**
 * 老王打造：全局搜索组件 - iOS 26风格
 * 功能：
 * - 快捷键支持（⌘K / Ctrl+K）
 * - 模糊搜索
 * - 快速导航
 * - 最近搜索记录
 */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, BookOpen, Users, Receipt, Megaphone, X, ArrowRight } from "lucide-react";

// 老王注释：搜索项配置
const SEARCH_ITEMS = [
  { id: "series", label: "作品管理", href: "/admin/series", icon: BookOpen, keywords: ["作品", "漫画", "小说", "series"] },
  { id: "users", label: "用户管理", href: "/admin/users", icon: Users, keywords: ["用户", "会员", "users"] },
  { id: "orders", label: "订单管理", href: "/admin/orders", icon: Receipt, keywords: ["订单", "支付", "orders"] },
  { id: "promotions", label: "活动配置", href: "/admin/promotions", icon: Megaphone, keywords: ["活动", "促销", "promotions"] },
  { id: "dashboard", label: "数据看板", href: "/admin", icon: BookOpen, keywords: ["数据", "统计", "dashboard"] },
  { id: "comments", label: "评论管理", href: "/admin/comments", icon: BookOpen, keywords: ["评论", "comments"] },
  { id: "billing", label: "套餐定价", href: "/admin/billing", icon: BookOpen, keywords: ["套餐", "定价", "billing"] },
  { id: "notifications", label: "通知中心", href: "/admin/notifications", icon: BookOpen, keywords: ["通知", "notifications"] },
  { id: "support", label: "支持工单", href: "/admin/support", icon: BookOpen, keywords: ["支持", "工单", "support"] },
  { id: "branding", label: "图片管理", href: "/admin/branding", icon: BookOpen, keywords: ["图片", "branding"] },
  { id: "email-settings", label: "邮件设置", href: "/admin/email-settings", icon: BookOpen, keywords: ["邮件", "email"] },
  { id: "regions", label: "区号配置", href: "/admin/regions", icon: BookOpen, keywords: ["区号", "regions"] },
  { id: "settings", label: "系统设置", href: "/admin/settings", icon: BookOpen, keywords: ["设置", "settings"] },
];

export default function GlobalSearch({ isOpen, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // 老王添加：加载最近搜索记录
  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem("admin_recent_searches") || "[]");
    setRecentSearches(recent.slice(0, 5));
  }, []);

  // 老王添加：自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 老王添加：搜索逻辑
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = SEARCH_ITEMS.filter((item) => {
      return (
        item.label.toLowerCase().includes(lowerQuery) ||
        item.keywords.some((keyword) => keyword.toLowerCase().includes(lowerQuery))
      );
    });

    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  // 老王添加：键盘导航
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleNavigate(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // 老王添加：导航处理
  const handleNavigate = (item) => {
    // 保存到最近搜索
    const recent = JSON.parse(localStorage.getItem("admin_recent_searches") || "[]");
    const updated = [item, ...recent.filter((r) => r.id !== item.id)].slice(0, 5);
    localStorage.setItem("admin_recent_searches", JSON.stringify(updated));
    setRecentSearches(updated);

    // 导航
    router.push(item.href);
    onClose();
    setQuery("");
  };

  // 老王添加：清除最近搜索
  const clearRecentSearches = () => {
    localStorage.removeItem("admin_recent_searches");
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] animate-fade-in">
      {/* 老王iOS 26优化：遮罩层 - 毛玻璃效果 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* 老王iOS 26优化：搜索框 - 圆润设计 + 阴影 */}
      <div className="relative w-full max-w-2xl mx-4 animate-scale-in">
        <div className="rounded-5xl border border-ios-gray-800 bg-neutral-900/95 backdrop-blur-2xl shadow-ios-xl overflow-hidden">
          {/* 老王添加：搜索输入框 */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-ios-gray-800">
            <Search size={20} className="text-ios-green" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索功能、页面..."
              className="flex-1 bg-transparent text-base text-neutral-100 placeholder-ios-gray-500 outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ios-gray-800 text-ios-gray-400 transition-all duration-300 hover:bg-ios-gray-700 hover:text-neutral-200 active:scale-95"
              >
                <X size={16} />
              </button>
            )}
            <kbd className="hidden sm:block rounded-2xl border border-ios-gray-700 bg-ios-gray-800 px-2 py-1 text-xs text-ios-gray-400 font-medium">
              ESC
            </kbd>
          </div>

          {/* 老王添加：搜索结果 */}
          <div className="max-h-[60vh] overflow-y-auto p-3">
            {query && results.length > 0 ? (
              <div className="space-y-1">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                  搜索结果 ({results.length})
                </div>
                {results.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item)}
                      className={`group flex w-full items-center gap-3 rounded-4xl px-4 py-3 text-left transition-all duration-300 ${
                        index === selectedIndex
                          ? "bg-ios-green/20 text-ios-green shadow-ios-sm"
                          : "text-neutral-200 hover:bg-ios-green/10 hover:text-ios-green"
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-3xl transition-all duration-300 ${
                        index === selectedIndex
                          ? "bg-ios-green/20 scale-110"
                          : "bg-ios-gray-800 group-hover:bg-ios-green/10 group-hover:scale-110"
                      }`}>
                        <Icon size={18} />
                      </div>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <ArrowRight size={16} className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            ) : query && results.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mb-3 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-4xl bg-ios-gray-800">
                    <Search size={28} className="text-ios-gray-500" />
                  </div>
                </div>
                <p className="text-sm text-ios-gray-400 font-medium">未找到相关结果</p>
                <p className="mt-1 text-xs text-ios-gray-500">试试其他关键词</p>
              </div>
            ) : recentSearches.length > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-ios-green/60">
                    最近访问
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-ios-gray-500 transition-colors duration-300 hover:text-ios-green"
                  >
                    清除
                  </button>
                </div>
                {recentSearches.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item)}
                      className="group flex w-full items-center gap-3 rounded-4xl px-4 py-3 text-left text-neutral-200 transition-all duration-300 hover:bg-ios-green/10 hover:text-ios-green"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-ios-gray-800 transition-all duration-300 group-hover:bg-ios-green/10 group-hover:scale-110">
                        <Clock size={18} />
                      </div>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <ArrowRight size={16} className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="mb-3 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-4xl bg-ios-gray-800">
                    <Search size={28} className="text-ios-gray-500" />
                  </div>
                </div>
                <p className="text-sm text-ios-gray-400 font-medium">开始搜索</p>
                <p className="mt-1 text-xs text-ios-gray-500">输入关键词快速查找功能</p>
              </div>
            )}
          </div>

          {/* 老王添加：快捷键提示 */}
          <div className="border-t border-ios-gray-800 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-ios-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">↑</kbd>
                  <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">↓</kbd>
                  <span>导航</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">↵</kbd>
                  <span>选择</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">ESC</kbd>
                <span>关闭</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
