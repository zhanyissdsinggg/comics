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
    label: "总览",
    items: [
      { label: "仪表盘", href: "/admin", icon: BarChart3, match: ["/admin"], exact: true },
    ],
  },
  {
    label: "内容",
    items: [
      {
        label: "作品",
        href: "/admin/series",
        icon: BookOpen,
        match: ["/admin/series"],
        children: [
          { label: "漫画", href: "/admin/series?type=comic" },
          { label: "小说", href: "/admin/series?type=novel" },
        ],
      },
      {
        label: "前台体检",
        href: "/admin/storefront",
        icon: Search,
        match: ["/admin/storefront"],
      },
      {
        label: "首页编排",
        href: "/admin/merchandising",
        icon: Sparkles,
        match: ["/admin/merchandising"],
      },
      { label: "评论", href: "/admin/comments", icon: MessageSquare, match: ["/admin/comments"] },
    ],
  },
  {
    label: "交易",
    items: [
      { label: "活动", href: "/admin/promotions", icon: Megaphone, match: ["/admin/promotions"] },
      { label: "订单", href: "/admin/orders", icon: Receipt, match: ["/admin/orders"] },
      { label: "计费", href: "/admin/billing", icon: CreditCard, match: ["/admin/billing"] },
      { label: "通知", href: "/admin/notifications", icon: Bell, match: ["/admin/notifications"] },
    ],
  },
  {
    label: "用户运营",
    items: [
      { label: "用户", href: "/admin/users", icon: Users, match: ["/admin/users"] },
      { label: "工单", href: "/admin/support", icon: LifeBuoy, match: ["/admin/support"] },
      { label: "创作者", href: "/admin/creators", icon: PenSquare, match: ["/admin/creators"] },
    ],
  },
  {
    label: "系统",
    items: [
      { label: "品牌设置", href: "/admin/branding", icon: Image, match: ["/admin/branding"] },
      { label: "邮件设置", href: "/admin/email-settings", icon: Mail, match: ["/admin/email-settings"] },
      { label: "邮件任务", href: "/admin/email-jobs", icon: MailCheck, match: ["/admin/email-jobs"] },
      { label: "追踪设置", href: "/admin/tracking", icon: Radar, match: ["/admin/tracking"] },
      { label: "地区设置", href: "/admin/regions", icon: Globe, match: ["/admin/regions"] },
      { label: "系统设置", href: "/admin/settings", icon: Settings, match: ["/admin/settings"] },
    ],
  },
];

const BREADCRUMB_MAP = [
  { match: "/admin", label: "仪表盘", exact: true },
  { match: "/admin/series", label: "作品" },
  { match: "/admin/storefront", label: "前台体检" },
  { match: "/admin/merchandising", label: "首页编排" },
  { match: "/admin/promotions", label: "活动" },
  { match: "/admin/orders", label: "订单" },
  { match: "/admin/billing", label: "计费" },
  { match: "/admin/branding", label: "品牌设置" },
  { match: "/admin/email-settings", label: "邮件设置" },
  { match: "/admin/email-jobs", label: "邮件任务" },
  { match: "/admin/regions", label: "地区设置" },
  { match: "/admin/support", label: "工单" },
  { match: "/admin/creators", label: "创作者" },
  { match: "/admin/users", label: "用户" },
  { match: "/admin/tracking", label: "追踪设置" },
  { match: "/admin/notifications", label: "通知" },
  { match: "/admin/comments", label: "评论" },
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

    return group?.label || "总览";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.1),transparent_18%),radial-gradient(circle_at_85%_0%,rgba(56,189,248,0.08),transparent_22%),linear-gradient(180deg,#070b12_0%,#090d15_100%)] text-neutral-100">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(10,14,20,0.98),rgba(7,10,15,0.98))] shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition-all duration-300 lg:relative",
            isCollapsed ? "w-24" : "w-80",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_86%_0%,rgba(16,185,129,0.12),transparent_22%)]" />
          <div className="relative flex h-full flex-col">
            <div className="border-b border-white/10 px-4 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-emerald-400/20 bg-emerald-400/10 text-lg font-bold text-white shadow-[0_18px_45px_rgba(16,185,129,0.18)]">
                    MN
                  </div>
                  {!isCollapsed ? (
                    <div>
                      <h1 className="text-base font-semibold text-white">后台总控台</h1>
                      <p className="mt-1 text-xs text-neutral-500">中文运营工作台</p>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setIsCollapsed((current) => !current)}
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white lg:flex"
                  aria-label={isCollapsed ? "展开侧栏" : "收起侧栏"}
                >
                  {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
              </div>

              {!isCollapsed ? (
                <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                    当前分区
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">{activeGroupLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-400">
                    侧栏、搜索与页面主内容已经统一成同一套运营界面语言。
                  </p>
                </div>
              ) : null}
            </div>

            <div className="px-4 py-4">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
                  isCollapsed ? "justify-center px-0" : "",
                )}
              >
                <Search size={18} className="shrink-0 text-emerald-200" />
                {!isCollapsed ? (
                  <>
                    <span className="flex-1">全局搜索</span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                      Ctrl+K
                    </span>
                  </>
                ) : null}
              </button>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  {!isCollapsed ? (
                    <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
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

                      return (
                        <div key={item.label}>
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleMenu(item.href)}
                              className={cn(
                                "group flex w-full items-center gap-3 rounded-[22px] border px-4 py-3 text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "border-white/10 bg-white/[0.08] text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
                                  : "border-transparent text-neutral-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-white",
                              )}
                              title={isCollapsed ? item.label : undefined}
                            >
                              <Icon
                                size={18}
                                className={cn(
                                  "shrink-0 transition-transform duration-200",
                                  isActive ? "text-emerald-200" : "text-neutral-500 group-hover:text-white",
                                )}
                              />
                              {!isCollapsed ? <span className="flex-1 truncate text-left">{item.label}</span> : null}
                              {!isCollapsed ? (
                                <ChevronDown
                                  size={16}
                                  className={cn(
                                    "shrink-0 text-neutral-500 transition-transform duration-200",
                                    isExpanded ? "rotate-180" : "",
                                  )}
                                />
                              ) : null}
                            </button>
                          ) : (
                            <Link
                              href={item.href}
                              className={cn(
                                "group flex items-center gap-3 rounded-[22px] border px-4 py-3 text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "border-white/10 bg-white/[0.08] text-white shadow-[0_18px_45px_rgba(0,0,0,0.18)]"
                                  : "border-transparent text-neutral-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-white",
                              )}
                              title={isCollapsed ? item.label : undefined}
                            >
                              <Icon
                                size={18}
                                className={cn(
                                  "shrink-0 transition-transform duration-200",
                                  isActive ? "text-emerald-200" : "text-neutral-500 group-hover:text-white",
                                )}
                              />
                              {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
                              {isActive && !isCollapsed ? (
                                <span className="ml-auto h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.6)]" />
                              ) : null}
                            </Link>
                          )}

                          {hasChildren && isExpanded && !isCollapsed ? (
                            <div className="mt-1 ml-6 space-y-1 border-l border-white/10 pl-3">
                              {item.children.map((child) => {
                                const childIsActive = isChildLinkActive(pathname, searchParams, child.href);

                                return (
                                  <Link
                                    key={child.label}
                                    href={child.href}
                                    className={cn(
                                      "group flex items-center gap-2 rounded-[18px] px-3 py-2 text-xs font-medium transition-all duration-200",
                                      childIsActive
                                        ? "bg-emerald-400/10 text-emerald-100"
                                        : "text-neutral-500 hover:bg-white/[0.05] hover:text-white",
                                    )}
                                  >
                                    <span className="truncate">{child.label}</span>
                                    {childIsActive ? (
                                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300" />
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
              <div className="border-t border-white/10 p-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-sm font-semibold text-white">
                      A
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">管理员</p>
                      <p className="truncate text-xs text-neutral-500">安全会话正常</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-neutral-400">
                    后台保持中文，方便你直接运营、排查和调整前台内容。
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {isMobileMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/70 backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
            <div className="relative flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((current) => !current)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.08] lg:hidden"
                  aria-label="打开导航"
                >
                  <ChevronRight size={20} />
                </button>

                <div>
                  <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200">
                    {breadcrumb}
                  </div>
                  <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h1>
                  {subtitle ? (
                    <p className="mt-1 text-sm leading-6 text-neutral-400">{subtitle}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.08] md:flex"
                >
                  <Search size={16} className="text-emerald-200" />
                  <span>搜索</span>
                  <kbd className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                    Ctrl+K
                  </kbd>
                </button>
                {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </main>
        </div>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
