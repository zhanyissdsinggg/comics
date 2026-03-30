"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Globe,
  Image,
  LifeBuoy,
  Mail,
  MailCheck,
  Menu,
  Megaphone,
  MessageSquare,
  PenSquare,
  Radar,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import GlobalSearch from "./GlobalSearch";

const NAV_GROUPS = [
  {
    label: "工作区",
    items: [
      { label: "仪表盘", href: "/admin", icon: BarChart3, match: ["/admin"], exact: true },
      {
        label: "作品",
        href: "/admin/series",
        icon: BookOpen,
        match: ["/admin/series"],
        children: [
          { label: "全部作品", href: "/admin/series" },
          { label: "漫画", href: "/admin/series?type=comic" },
          { label: "小说", href: "/admin/series?type=novel" },
        ],
      },
      {
        label: "创作者",
        href: "/admin/creators",
        icon: PenSquare,
        match: ["/admin/creators"],
      },
    ],
  },
  {
    label: "发现与前台",
    items: [
      {
        label: "前台巡检",
        href: "/admin/storefront",
        icon: Search,
        match: ["/admin/storefront"],
      },
      {
        label: "内容编排",
        href: "/admin/merchandising",
        icon: Sparkles,
        match: ["/admin/merchandising"],
      },
      {
        label: "评论",
        href: "/admin/comments",
        icon: MessageSquare,
        match: ["/admin/comments"],
      },
    ],
  },
  {
    label: "用户与服务",
    items: [
      { label: "用户", href: "/admin/users", icon: Users, match: ["/admin/users"] },
      { label: "客服支持", href: "/admin/support", icon: LifeBuoy, match: ["/admin/support"] },
      {
        label: "通知",
        href: "/admin/notifications",
        icon: Bell,
        match: ["/admin/notifications"],
      },
    ],
  },
  {
    label: "商业",
    items: [
      {
        label: "活动",
        href: "/admin/promotions",
        icon: Megaphone,
        match: ["/admin/promotions"],
      },
      { label: "订单", href: "/admin/orders", icon: Receipt, match: ["/admin/orders"] },
      { label: "计费", href: "/admin/billing", icon: CreditCard, match: ["/admin/billing"] },
    ],
  },
  {
    label: "设置",
    items: [
      {
        label: "品牌素材",
        href: "/admin/branding",
        icon: Image,
        match: ["/admin/branding"],
      },
      {
        label: "邮件设置",
        href: "/admin/email-settings",
        icon: Mail,
        match: ["/admin/email-settings"],
      },
      {
        label: "邮件任务",
        href: "/admin/email-jobs",
        icon: MailCheck,
        match: ["/admin/email-jobs"],
      },
      {
        label: "跟踪设置",
        href: "/admin/tracking",
        icon: Radar,
        match: ["/admin/tracking"],
      },
      {
        label: "地区",
        href: "/admin/regions",
        icon: Globe,
        match: ["/admin/regions"],
      },
      {
        label: "系统设置",
        href: "/admin/settings",
        icon: Settings,
        match: ["/admin/settings"],
      },
    ],
  },
];

const BREADCRUMB_MAP = [
  { match: "/admin", label: "仪表盘", exact: true },
  { match: "/admin/series", label: "作品" },
  { match: "/admin/creators", label: "创作者" },
  { match: "/admin/storefront", label: "前台巡检" },
  { match: "/admin/merchandising", label: "内容编排" },
  { match: "/admin/comments", label: "评论" },
  { match: "/admin/promotions", label: "活动" },
  { match: "/admin/orders", label: "订单" },
  { match: "/admin/billing", label: "计费" },
  { match: "/admin/notifications", label: "通知" },
  { match: "/admin/users", label: "用户" },
  { match: "/admin/support", label: "客服支持" },
  { match: "/admin/branding", label: "品牌素材" },
  { match: "/admin/email-settings", label: "邮件设置" },
  { match: "/admin/email-jobs", label: "邮件任务" },
  { match: "/admin/tracking", label: "跟踪设置" },
  { match: "/admin/regions", label: "地区" },
  { match: "/admin/settings", label: "系统设置" },
];

function getBreadcrumb(pathname) {
  const hit = BREADCRUMB_MAP.find((item) => {
    if (item.exact) {
      return pathname === item.match;
    }

    return pathname.startsWith(item.match);
  });

  return hit ? hit.label : "后台";
}

function isChildLinkActive(pathname, searchParams, href) {
  const [targetPath, targetQuery = ""] = href.split("?");
  if (pathname !== targetPath) {
    return false;
  }

  if (!targetQuery) {
    return true;
  }

  return searchParams.toString() === targetQuery;
}

export default function AdminShell({ title, subtitle, children, actions }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const breadcrumb = getBreadcrumb(pathname);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(new Set(["/admin/series"]));
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const activeGroupLabel = useMemo(() => {
    const group = NAV_GROUPS.find((item) =>
      item.items.some((navItem) =>
        navItem.exact
          ? pathname === navItem.href
          : navItem.match?.some((prefix) => pathname.startsWith(prefix)),
      ),
    );

    return group?.label || "工作区";
  }, [pathname]);

  const toggleMenu = (href) => {
    setExpandedMenus((current) => {
      const next = new Set(current);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="admin-theme relative min-h-screen overflow-hidden bg-[var(--gush-page-bg)] text-[var(--gush-ink-strong)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[24rem] bg-[radial-gradient(circle_at_12%_0%,rgba(47,88,198,0.09),transparent_22%),radial-gradient(circle_at_88%_2%,rgba(255,255,255,0.8),transparent_18%),linear-gradient(180deg,rgba(248,245,239,0.96),rgba(244,241,234,0.18))]" />

      <div className="relative flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-black/6 bg-[rgba(248,245,239,0.94)] shadow-[var(--gush-shadow-soft)] backdrop-blur-xl transition-all duration-300 lg:relative",
            isCollapsed ? "w-[92px]" : "w-[284px]",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-black/6 px-4 py-5">
              <div className="flex items-start justify-between gap-3">
                <Link href="/admin" className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[rgba(47,88,198,0.12)] bg-[rgba(47,88,198,0.08)] text-sm font-semibold text-[var(--gush-accent,#2f58c6)]">
                    TT
                  </div>
                  {!isCollapsed ? (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        后台
                      </p>
                      <h1 className="mt-1 text-base font-semibold text-slate-950">
                        内容管理后台
                      </h1>
                    </div>
                  ) : null}
                </Link>

                <button
                  type="button"
                  onClick={() => setIsCollapsed((current) => !current)}
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-white text-slate-500 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950 lg:flex"
                  aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
                >
                  {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
              </div>

              {!isCollapsed ? (
                <div className="mt-4 rounded-[24px] border border-black/8 bg-white/76 px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.03)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    当前分区
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{activeGroupLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    用更安静的方式处理作品、署名和前台编排。
                  </p>
                </div>
              ) : null}
            </div>

            <div className="px-4 py-4">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-full border border-black/8 bg-white px-4 text-left text-sm text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950",
                  isCollapsed ? "justify-center px-0" : "",
                )}
              >
                    <Search size={17} className="shrink-0 text-slate-500" />
                {!isCollapsed ? (
                  <>
                    <span className="flex-1">搜索后台页面</span>
                    <span className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      Ctrl+K
                    </span>
                  </>
                ) : null}
              </button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  {!isCollapsed ? (
                    <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {group.label}
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = item.exact
                        ? pathname === item.href
                        : item.match?.some((prefix) => pathname.startsWith(prefix));
                      const Icon = item.icon;
                      const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                      const isExpanded = expandedMenus.has(item.href);

                      const baseClass =
                        "group flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-sm font-medium transition-all duration-200";
                      const activeClass =
                        "border-[rgba(47,88,198,0.14)] bg-[rgba(47,88,198,0.06)] text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.03)]";
                      const idleClass =
                        "border-transparent text-slate-600 hover:border-black/6 hover:bg-white/70 hover:text-slate-950";

                      return (
                        <div key={item.label}>
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleMenu(item.href)}
                              className={cn(baseClass, isActive ? activeClass : idleClass)}
                              title={isCollapsed ? item.label : undefined}
                            >
                              <Icon
                                size={18}
                                className={cn(
                                  "shrink-0",
                                  isActive ? "text-[var(--gush-accent,#2f58c6)]" : "text-slate-400",
                                )}
                              />
                              {!isCollapsed ? (
                                <span className="flex-1 truncate text-left">{item.label}</span>
                              ) : null}
                              {!isCollapsed ? (
                                <ChevronDown
                                  size={16}
                                  className={cn(
                                    "shrink-0 text-slate-400 transition-transform duration-200",
                                    isExpanded ? "rotate-180" : "",
                                  )}
                                />
                              ) : null}
                            </button>
                          ) : (
                            <Link
                              href={item.href}
                              className={cn(baseClass, isActive ? activeClass : idleClass)}
                              title={isCollapsed ? item.label : undefined}
                            >
                              <Icon
                                size={18}
                                className={cn(
                                  "shrink-0",
                                  isActive ? "text-[var(--gush-accent,#2f58c6)]" : "text-slate-400",
                                )}
                              />
                              {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
                              {isActive && !isCollapsed ? (
                                <span className="ml-auto h-2 w-2 rounded-full bg-[var(--gush-accent,#2f58c6)]" />
                              ) : null}
                            </Link>
                          )}

                          {hasChildren && isExpanded && !isCollapsed ? (
                            <div className="mt-1 ml-6 space-y-1 border-l border-black/6 pl-3">
                              {item.children.map((child) => {
                                const childIsActive = isChildLinkActive(
                                  pathname,
                                  searchParams,
                                  child.href,
                                );

                                return (
                                  <Link
                                    key={child.label}
                                    href={child.href}
                                    className={cn(
                                      "group flex items-center gap-2 rounded-[16px] px-3 py-2 text-xs font-medium transition-all duration-200",
                                      childIsActive
                                        ? "bg-[rgba(47,88,198,0.06)] text-[var(--gush-accent,#2f58c6)]"
                                        : "text-slate-500 hover:bg-white/70 hover:text-slate-950",
                                    )}
                                  >
                                    <span className="truncate">{child.label}</span>
                                    {childIsActive ? (
                                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--gush-accent,#2f58c6)]" />
                                    ) : null}
                                  </Link>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {!isCollapsed ? (
              <div className="border-t border-black/6 p-4">
                <div className="rounded-[24px] border border-black/8 bg-white/76 px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.03)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    会话
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    后台权限已生效
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    在这里处理作品更新、创作者署名和前台展示，不需要再看一堆没用的噪音指标。
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {isMobileMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-[rgba(20,27,36,0.28)] backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-black/6 bg-[rgba(244,241,234,0.84)] backdrop-blur-xl">
            <div className="mx-auto flex w-[min(var(--gush-page-max-wide),calc(100%-2rem))] items-center justify-between gap-4 py-4">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((current) => !current)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white text-slate-600 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950 lg:hidden"
                  aria-label="打开导航"
                >
                  <Menu size={20} />
                </button>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {breadcrumb}
                  </p>
                  <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-950 sm:text-[2.1rem]">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="hidden h-11 items-center gap-2 rounded-full border border-black/8 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-black/12 hover:bg-[rgba(250,248,244,0.96)] hover:text-slate-950 md:flex"
                >
                  <Search size={16} className="text-slate-500" />
                  <span>搜索</span>
                  <kbd className="rounded-full border border-black/8 bg-[rgba(250,247,241,0.9)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Ctrl+K
                  </kbd>
                </button>
                {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-[min(var(--gush-page-max-wide),calc(100%-2rem))] py-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
