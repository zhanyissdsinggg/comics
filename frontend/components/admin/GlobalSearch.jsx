"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Clock,
  CreditCard,
  Globe,
  Image,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageSquare,
  PenSquare,
  Radar,
  Receipt,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { canAccessAdminRoute } from "../../lib/adminAccess";

const RECENT_SEARCH_STORAGE_KEY = "admin_recent_searches";

const SEARCH_ITEMS = [
  {
    id: "dashboard",
    label: "仪表盘",
    href: "/admin",
    icon: BookOpen,
    keywords: ["dashboard", "overview", "workspace", "home", "仪表盘", "总览", "工作台"],
  },
  {
    id: "analytics",
    label: "数据分析",
    href: "/admin/analytics",
    icon: BarChart3,
    keywords: ["analytics", "insights", "report", "数据分析", "分析", "报表", "数据"],
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
    id: "recommendations",
    label: "推荐位",
    href: "/admin/recommendations",
    icon: Sparkles,
    keywords: ["recommendation", "slot", "placement", "featured", "推荐位", "推荐", "排位", "卡槽"],
  },
  {
    id: "content-generator",
    label: "内容生成器",
    href: "/admin/content-generator",
    icon: Sparkles,
    keywords: ["generator", "seed", "fixture", "test content", "内容生成器", "测试内容", "生成", "种子"],
  },
  {
    id: "creators",
    label: "创作者",
    href: "/admin/creators",
    icon: PenSquare,
    keywords: ["creators", "author", "artist", "studio", "credits", "创作者", "作者", "画师", "团队", "署名"],
  },
  {
    id: "comments",
    label: "评论",
    href: "/admin/comments",
    icon: MessageSquare,
    keywords: ["comments", "feedback", "community", "评论", "反馈"],
  },
  {
    id: "users",
    label: "用户",
    href: "/admin/users",
    icon: Users,
    keywords: ["users", "accounts", "reader", "customer", "用户", "账号", "读者"],
  },
  {
    id: "members",
    label: "后台成员",
    href: "/admin/members",
    icon: ShieldCheck,
    keywords: ["admin members", "staff", "rbac", "2fa", "后台成员", "管理员", "角色权限", "二次验证"],
  },
  {
    id: "support",
    label: "客服支持",
    href: "/admin/support",
    icon: LifeBuoy,
    keywords: ["support", "tickets", "help", "客服", "工单", "支持"],
  },
  {
    id: "notifications",
    label: "通知",
    href: "/admin/notifications",
    icon: Bell,
    keywords: ["notifications", "messages", "alerts", "通知", "消息", "提醒"],
  },
  {
    id: "orders",
    label: "订单",
    href: "/admin/orders",
    icon: Receipt,
    keywords: ["orders", "payments", "transactions", "订单", "支付", "交易"],
  },
  {
    id: "billing",
    label: "计费",
    href: "/admin/billing",
    icon: CreditCard,
    keywords: ["billing", "pricing", "wallet", "commercial", "计费", "钱包", "商业"],
  },
  {
    id: "revenue",
    label: "收入",
    href: "/admin/revenue",
    icon: CreditCard,
    keywords: ["revenue", "gross", "income", "finance", "收入", "营收", "流水", "财务"],
  },
  {
    id: "promotions",
    label: "活动",
    href: "/admin/promotions",
    icon: Megaphone,
    keywords: ["promotions", "marketing", "campaigns", "活动", "营销", "促销"],
  },
  {
    id: "marketing",
    label: "营销",
    href: "/admin/marketing",
    icon: Megaphone,
    keywords: ["marketing", "campaigns", "segment", "渠道", "营销", "活动", "投放", "细分"],
  },
  {
    id: "logs",
    label: "审计日志",
    href: "/admin/logs",
    icon: ScrollText,
    keywords: ["logs", "audit", "history", "trace", "日志", "审计", "记录", "操作历史"],
  },
  {
    id: "branding",
    label: "品牌素材",
    href: "/admin/branding",
    icon: Image,
    keywords: ["branding", "logo", "banner", "assets", "品牌", "标识", "横幅", "素材"],
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
    label: "追踪设置",
    href: "/admin/tracking",
    icon: Radar,
    keywords: ["tracking", "analytics", "pixels", "追踪", "埋点", "像素"],
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

export default function GlobalSearch({ isOpen, onClose, routePatterns = [], homePath = "/admin" }) {
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
      if (!canAccessAdminRoute(item.href, routePatterns)) {
        return false;
      }
      if (item.label.toLowerCase().includes(trimmedQuery)) {
        return true;
      }

      return item.keywords.some((keyword) => keyword.toLowerCase().includes(trimmedQuery));
    });
  }, [query, routePatterns]);

  const recentItems = useMemo(
    () =>
      recentSearchIds
        .map((id) => getSearchItemById(id))
        .filter((item) => item && canAccessAdminRoute(item.href, routePatterns)),
    [recentSearchIds, routePatterns],
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
    if (!item || !canAccessAdminRoute(item.href, routePatterns)) {
      onClose();
      router.push(homePath || "/admin");
      return;
    }

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
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[rgba(244,244,246,0.78)] p-4 pt-[10vh] backdrop-blur-[18px]">
      <div className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,246,248,0.94))] shadow-[0_36px_90px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.04]">
        <div className="border-b border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,248,249,0.96))] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
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
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              onClick={onClose}
              aria-label="关闭搜索"
            >
              <X size={18} />
            </Button>
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
                    className={`group flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition-all ${
                      isActive
                        ? "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,245,247,0.94))] text-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.02]"
                        : "border-transparent text-slate-700 hover:border-[color:var(--gush-border)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,245,247,0.72))] hover:text-slate-950"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-[16px] border transition-all ${
                        isActive
                          ? "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f4f4f6)] text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                          : "border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f8f8f9)] text-slate-500 group-hover:border-[color:var(--gush-border-strong)] group-hover:bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] group-hover:text-slate-950"
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{item.label}</div>
                      <div className="truncate text-xs text-slate-500">{item.href}</div>
                    </div>
                    <ArrowRight
                      size={16}
                      className={`text-slate-400 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    />
                  </button>
                );
              })}
            </div>
          ) : query ? (
            <div className="mx-auto max-w-sm rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,246,248,0.92))] px-6 py-12 text-center shadow-[0_16px_36px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-400 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">没有找到匹配页面</p>
              <p className="mt-1 text-xs text-slate-500">换个关键词再试试。</p>
            </div>
          ) : recentItems.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  最近访问
                </div>
                <Button type="button" variant="ghost" size="xs" onClick={handleClearRecent}>
                  清空
                </Button>
              </div>
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item)}
                  className="group flex w-full items-center gap-3 rounded-[22px] border border-transparent px-4 py-3 text-left text-slate-700 transition-all hover:border-[color:var(--gush-border)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(245,245,247,0.72))] hover:text-slate-950"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f8f8f9)] text-slate-400 transition-all group-hover:border-[color:var(--gush-border-strong)] group-hover:bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] group-hover:text-slate-950">
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
            <div className="mx-auto max-w-sm rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,246,248,0.92))] px-6 py-12 text-center shadow-[0_16px_36px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-400 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                  <Search size={28} />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">输入内容即可搜索后台</p>
              <p className="mt-1 text-xs text-slate-500">按页面名或对象类型查找。</p>
            </div>
          )}
        </div>

        <div className="border-t border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(246,246,248,0.94))] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f4f4f6)] px-1.5 py-0.5 font-medium shadow-[0_4px_10px_rgba(15,23,42,0.03)]">
                  ↑
                </kbd>
                <kbd className="rounded-lg border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f4f4f6)] px-1.5 py-0.5 font-medium shadow-[0_4px_10px_rgba(15,23,42,0.03)]">
                  ↓
                </kbd>
                <span>移动</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="rounded-lg border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f4f4f6)] px-1.5 py-0.5 font-medium shadow-[0_4px_10px_rgba(15,23,42,0.03)]">
                  Enter
                </kbd>
                <span>打开</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="rounded-lg border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,#ffffff,#f4f4f6)] px-1.5 py-0.5 font-medium shadow-[0_4px_10px_rgba(15,23,42,0.03)]">
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
