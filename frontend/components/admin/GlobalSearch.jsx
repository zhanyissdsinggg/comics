"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Clock,
  CreditCard,
  Globe,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageSquare,
  Radar,
  Receipt,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

const RECENT_SEARCH_STORAGE_KEY = "admin_recent_searches";

const SEARCH_ITEMS = [
  {
    id: "dashboard",
    label: "仪表盘",
    href: "/admin",
    icon: BookOpen,
    keywords: ["仪表盘", "总览", "分析", "统计"],
  },
  {
    id: "series",
    label: "作品",
    href: "/admin/series",
    icon: BookOpen,
    keywords: ["作品", "漫画", "小说", "内容"],
  },
  {
    id: "users",
    label: "用户",
    href: "/admin/users",
    icon: Users,
    keywords: ["用户", "客户", "账号", "会员"],
  },
  {
    id: "orders",
    label: "订单",
    href: "/admin/orders",
    icon: Receipt,
    keywords: ["订单", "支付", "交易", "账单"],
  },
  {
    id: "promotions",
    label: "活动",
    href: "/admin/promotions",
    icon: Megaphone,
    keywords: ["活动", "营销", "优惠", "折扣"],
  },
  {
    id: "comments",
    label: "评论",
    href: "/admin/comments",
    icon: MessageSquare,
    keywords: ["评论", "评价", "评分", "反馈"],
  },
  {
    id: "billing",
    label: "充值套餐",
    href: "/admin/billing",
    icon: CreditCard,
    keywords: ["充值", "套餐", "价格", "点数"],
  },
  {
    id: "notifications",
    label: "通知",
    href: "/admin/notifications",
    icon: Bell,
    keywords: ["通知", "消息", "提醒"],
  },
  {
    id: "support",
    label: "工单支持",
    href: "/admin/support",
    icon: LifeBuoy,
    keywords: ["支持", "工单", "帮助"],
  },
  {
    id: "branding",
    label: "品牌设置",
    href: "/admin/branding",
    icon: BookOpen,
    keywords: ["品牌", "素材", "标识", "图片"],
  },
  {
    id: "email-settings",
    label: "邮件设置",
    href: "/admin/email-settings",
    icon: Mail,
    keywords: ["邮件", "smtp", "邮箱", "设置"],
  },
  {
    id: "email-jobs",
    label: "邮件任务",
    href: "/admin/email-jobs",
    icon: Mail,
    keywords: ["邮件", "任务", "投递", "发送"],
  },
  {
    id: "tracking",
    label: "追踪设置",
    href: "/admin/tracking",
    icon: Radar,
    keywords: ["追踪", "像素", "分析", "事件"],
  },
  {
    id: "regions",
    label: "地区设置",
    href: "/admin/regions",
    icon: Globe,
    keywords: ["地区", "国家", "价格", "区域"],
  },
  {
    id: "settings",
    label: "系统设置",
    href: "/admin/settings",
    icon: Settings,
    keywords: ["设置", "系统", "配置"],
  },
];

function getSearchItemById(id) {
  return SEARCH_ITEMS.find((item) => item.id === id) ?? null;
}

function readRecentSearchIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    const ids = JSON.parse(raw || "[]");
    return Array.isArray(ids) ? ids.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeRecentSearchIds(ids) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(ids));
}

export default function GlobalSearch({ isOpen, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearchIds, setRecentSearchIds] = useState([]);

  const results = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return [];
    }

    return SEARCH_ITEMS.filter((item) => {
      if (item.label.toLowerCase().includes(trimmedQuery)) {
        return true;
      }

      return item.keywords.some((keyword) => keyword.toLowerCase().includes(trimmedQuery));
    });
  }, [query]);

  const recentItems = useMemo(
    () => recentSearchIds.map((id) => getSearchItemById(id)).filter(Boolean),
    [recentSearchIds]
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setRecentSearchIds(readRecentSearchIds().slice(0, 5));
    setSelectedIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleNavigate = (item) => {
    const nextRecentIds = [item.id, ...recentSearchIds.filter((id) => id !== item.id)].slice(0, 5);
    setRecentSearchIds(nextRecentIds);
    writeRecentSearchIds(nextRecentIds);
    setQuery("");
    onClose();
    router.push(item.href);
  };

  const handleClearRecent = () => {
    setRecentSearchIds([]);
    writeRecentSearchIds([]);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      handleNavigate(results[selectedIndex]);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-md">
      <div className="w-full max-w-2xl animate-scale-in overflow-hidden rounded-[2rem] border border-ios-gray-800 bg-neutral-900/95 shadow-ios-xl backdrop-blur-2xl">
        <div className="border-b border-ios-gray-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-ios-green/10 text-ios-green">
              <Search size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索后台页面"
              className="flex-1 bg-transparent text-base text-neutral-100 outline-none placeholder:text-ios-gray-500"
            />
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-3xl bg-ios-gray-800 text-ios-gray-400 transition-all duration-300 hover:bg-ios-gray-700 hover:text-neutral-100"
              aria-label="关闭搜索"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-4">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === selectedIndex;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item)}
                    className={`group flex w-full items-center gap-3 rounded-4xl px-4 py-3 text-left transition-all duration-300 ${
                      isActive
                        ? "bg-ios-green/15 text-ios-green"
                        : "text-neutral-200 hover:bg-ios-green/10 hover:text-ios-green"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-ios-gray-800 transition-all duration-300 group-hover:bg-ios-green/10">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.label}</div>
                      <div className="truncate text-xs text-ios-gray-500">{item.href}</div>
                    </div>
                    <ArrowRight size={16} className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          ) : query ? (
            <div className="py-12 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-4xl bg-ios-gray-800 text-ios-gray-500">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-medium text-ios-gray-400">没有匹配的后台页面</p>
              <p className="mt-1 text-xs text-ios-gray-500">换个关键词再试试。</p>
            </div>
          ) : recentItems.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-ios-green/60">最近访问</div>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-xs text-ios-gray-500 transition-colors duration-300 hover:text-ios-green"
                >
                  清空
                </button>
              </div>
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item)}
                  className="group flex w-full items-center gap-3 rounded-4xl px-4 py-3 text-left text-neutral-200 transition-all duration-300 hover:bg-ios-green/10 hover:text-ios-green"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-ios-gray-800 transition-all duration-300 group-hover:bg-ios-green/10">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.label}</div>
                    <div className="truncate text-xs text-ios-gray-500">{item.href}</div>
                  </div>
                  <ArrowRight size={16} className="opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-4xl bg-ios-gray-800 text-ios-gray-500">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-medium text-ios-gray-400">输入内容即可搜索</p>
              <p className="mt-1 text-xs text-ios-gray-500">可输入页面名、关键词或功能意图。</p>
            </div>
          )}
        </div>

        <div className="border-t border-ios-gray-800 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ios-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">Up</kbd>
                <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">Down</kbd>
                <span>切换结果</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">Enter</kbd>
                <span>打开页面</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded-lg border border-ios-gray-700 bg-ios-gray-800 px-1.5 py-0.5 font-medium">Esc</kbd>
              <span>关闭</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
