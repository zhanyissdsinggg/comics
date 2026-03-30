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
  PenSquare,
  Radar,
  Receipt,
  Search,
  Settings,
  Sparkles,
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
    keywords: ["dashboard", "overview", "workspace", "home", "仪表盘", "概览", "工作区"],
  },
  {
    id: "series",
    label: "作品",
    href: "/admin/series",
    icon: BookOpen,
    keywords: ["series", "story", "comic", "novel", "catalog", "作品", "漫画", "小说", "目录"],
  },
  {
    id: "storefront",
    label: "前台巡检",
    href: "/admin/storefront",
    icon: Search,
    keywords: ["storefront", "audit", "readiness", "public page", "前台", "巡检", "上线", "读者页面"],
  },
  {
    id: "merchandising",
    label: "内容编排",
    href: "/admin/merchandising",
    icon: Sparkles,
    keywords: ["collections", "home", "curation", "featured", "编排", "推荐", "合集", "首页"],
  },
  {
    id: "users",
    label: "用户",
    href: "/admin/users",
    icon: Users,
    keywords: ["users", "accounts", "reader", "customer", "用户", "账号", "读者"],
  },
  {
    id: "orders",
    label: "订单",
    href: "/admin/orders",
    icon: Receipt,
    keywords: ["orders", "payments", "transactions", "订单", "支付", "交易"],
  },
  {
    id: "promotions",
    label: "活动",
    href: "/admin/promotions",
    icon: Megaphone,
    keywords: ["promotions", "marketing", "campaigns", "活动", "营销", "促销"],
  },
  {
    id: "comments",
    label: "评论",
    href: "/admin/comments",
    icon: MessageSquare,
    keywords: ["comments", "reviews", "feedback", "评论", "反馈"],
  },
  {
    id: "billing",
    label: "计费",
    href: "/admin/billing",
    icon: CreditCard,
    keywords: ["billing", "pricing", "wallet", "commercial", "计费", "钱包", "商业"],
  },
  {
    id: "notifications",
    label: "通知",
    href: "/admin/notifications",
    icon: Bell,
    keywords: ["notifications", "messages", "alerts", "通知", "消息", "提醒"],
  },
  {
    id: "support",
    label: "客服支持",
    href: "/admin/support",
    icon: LifeBuoy,
    keywords: ["support", "tickets", "help", "客服", "工单", "支持"],
  },
  {
    id: "creators",
    label: "创作者",
    href: "/admin/creators",
    icon: PenSquare,
    keywords: ["creators", "author", "artist", "studio", "credits", "创作者", "作者", "画师", "工作室", "署名"],
  },
  {
    id: "branding",
    label: "品牌素材",
    href: "/admin/branding",
    icon: BookOpen,
    keywords: ["branding", "logo", "banner", "assets", "品牌", "logo", "横幅", "素材"],
  },
  {
    id: "email-settings",
    label: "邮件设置",
    href: "/admin/email-settings",
    icon: Mail,
    keywords: ["email", "smtp", "mail settings", "邮件", "发信", "邮箱"],
  },
  {
    id: "email-jobs",
    label: "邮件任务",
    href: "/admin/email-jobs",
    icon: Mail,
    keywords: ["email", "deliveries", "jobs", "邮件", "投递", "任务"],
  },
  {
    id: "tracking",
    label: "跟踪设置",
    href: "/admin/tracking",
    icon: Radar,
    keywords: ["tracking", "analytics", "pixels", "跟踪", "埋点", "像素"],
  },
  {
    id: "regions",
    label: "地区",
    href: "/admin/regions",
    icon: Globe,
    keywords: ["regions", "country", "locale", "地区", "国家", "区号"],
  },
  {
    id: "settings",
    label: "系统设置",
    href: "/admin/settings",
    icon: Settings,
    keywords: ["settings", "system", "configuration", "设置", "系统", "配置"],
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
    [recentSearchIds],
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
    const nextRecentIds = [item.id, ...recentSearchIds.filter((id) => id !== item.id)].slice(
      0,
      5,
    );
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[rgba(20,27,36,0.28)] p-4 pt-[10vh] backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-black/8 bg-[rgba(255,255,255,0.94)] shadow-[var(--gush-shadow-panel)]">
        <div className="border-b border-black/6 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[rgba(47,88,198,0.08)] text-[var(--gush-accent,#2f58c6)]">
              <Search size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="搜索页面、工具或设置"
              className="flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-slate-500 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950"
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
                    className={`group flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left transition-all ${
                      isActive
                        ? "bg-[rgba(47,88,198,0.06)] text-slate-950"
                        : "text-slate-700 hover:bg-[rgba(15,23,42,0.04)] hover:text-slate-950"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-black/6 bg-[rgba(250,247,241,0.9)] text-slate-500 transition-all group-hover:text-[var(--gush-accent,#2f58c6)]">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{item.label}</div>
                      <div className="truncate text-xs text-slate-500">{item.href}</div>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </button>
                );
              })}
            </div>
          ) : query ? (
            <div className="py-12 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.9)] text-slate-400">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">没有匹配的后台页面</p>
              <p className="mt-1 text-xs text-slate-500">
                换个关键词或页面名称再试试。
              </p>
            </div>
          ) : recentItems.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  最近访问
                </div>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-xs text-slate-500 transition-colors hover:text-slate-950"
                >
                  清空
                </button>
              </div>
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item)}
                  className="group flex w-full items-center gap-3 rounded-[22px] px-4 py-3 text-left text-slate-700 transition-all hover:bg-[rgba(15,23,42,0.04)] hover:text-slate-950"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-black/6 bg-[rgba(250,247,241,0.9)] text-slate-400 transition-all group-hover:text-[var(--gush-accent,#2f58c6)]">
                    <Clock size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{item.label}</div>
                    <div className="truncate text-xs text-slate-500">{item.href}</div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-black/6 bg-[rgba(250,247,241,0.9)] text-slate-400">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">输入内容即可搜索后台</p>
              <p className="mt-1 text-xs text-slate-500">
                可以按页面名、任务或对象类型搜索。
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-black/6 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-black/8 bg-[rgba(250,247,241,0.9)] px-1.5 py-0.5 font-medium">
                  ↑
                </kbd>
                <kbd className="rounded-lg border border-black/8 bg-[rgba(250,247,241,0.9)] px-1.5 py-0.5 font-medium">
                  ↓
                </kbd>
                <span>移动</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-black/8 bg-[rgba(250,247,241,0.9)] px-1.5 py-0.5 font-medium">
                  Enter
                </kbd>
                <span>打开</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded-lg border border-black/8 bg-[rgba(250,247,241,0.9)] px-1.5 py-0.5 font-medium">
                Esc
              </kbd>
              <span>关闭</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
