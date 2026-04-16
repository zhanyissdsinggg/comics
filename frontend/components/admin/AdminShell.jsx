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
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import GlobalSearch from "./GlobalSearch";
import { useAdminAuth } from "./AuthContext";
import { canAccessAdminRoute, getAdminRoleLabel } from "../../lib/adminAccess";

const NAV_GROUPS = [
  {
    label: "工作台",
    items: [
      { label: "仪表盘", href: "/admin", icon: BarChart3, match: ["/admin"], exact: true },
      { label: "数据分析", href: "/admin/analytics", icon: BarChart3, match: ["/admin/analytics"] },
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
      { label: "创作者", href: "/admin/creators", icon: PenSquare, match: ["/admin/creators"] },
    ],
  },
  {
    label: "发现与前台",
    items: [
      { label: "前台巡检", href: "/admin/storefront", icon: Search, match: ["/admin/storefront"] },
      { label: "内容编排", href: "/admin/merchandising", icon: Sparkles, match: ["/admin/merchandising"] },
      { label: "推荐位", href: "/admin/recommendations", icon: Sparkles, match: ["/admin/recommendations"] },
      { label: "评论", href: "/admin/comments", icon: MessageSquare, match: ["/admin/comments"] },
    ],
  },
  {
    label: "用户与服务",
    items: [
      { label: "用户", href: "/admin/users", icon: Users, match: ["/admin/users"] },
      { label: "客服支持", href: "/admin/support", icon: LifeBuoy, match: ["/admin/support"] },
      { label: "通知", href: "/admin/notifications", icon: Bell, match: ["/admin/notifications"] },
      { label: "审计日志", href: "/admin/logs", icon: ScrollText, match: ["/admin/logs"] },
    ],
  },
  {
    label: "商业与收入",
    items: [
      { label: "活动", href: "/admin/promotions", icon: Megaphone, match: ["/admin/promotions"] },
      { label: "营销", href: "/admin/marketing", icon: Megaphone, match: ["/admin/marketing"] },
      { label: "订单", href: "/admin/orders", icon: Receipt, match: ["/admin/orders"] },
      { label: "收入", href: "/admin/revenue", icon: CreditCard, match: ["/admin/revenue"] },
      { label: "计费", href: "/admin/billing", icon: CreditCard, match: ["/admin/billing"] },
    ],
  },
  {
    label: "设置",
    items: [
      { label: "品牌素材", href: "/admin/branding", icon: Image, match: ["/admin/branding"] },
      { label: "邮件设置", href: "/admin/email-settings", icon: Mail, match: ["/admin/email-settings"] },
      { label: "邮件任务", href: "/admin/email-jobs", icon: MailCheck, match: ["/admin/email-jobs"] },
      { label: "追踪设置", href: "/admin/tracking", icon: Radar, match: ["/admin/tracking"] },
      { label: "后台成员", href: "/admin/members", icon: ShieldCheck, match: ["/admin/members"] },
      { label: "地区", href: "/admin/regions", icon: Globe, match: ["/admin/regions"] },
      { label: "系统设置", href: "/admin/settings", icon: Settings, match: ["/admin/settings"] },
    ],
  },
];

const BREADCRUMB_MAP = [
  { match: "/admin", label: "仪表盘", exact: true },
  { match: "/admin/analytics", label: "数据分析" },
  { match: "/admin/series", label: "作品" },
  { match: "/admin/creators", label: "创作者" },
  { match: "/admin/storefront", label: "前台巡检" },
  { match: "/admin/merchandising", label: "内容编排" },
  { match: "/admin/recommendations", label: "推荐位" },
  { match: "/admin/comments", label: "评论" },
  { match: "/admin/promotions", label: "活动" },
  { match: "/admin/marketing", label: "营销" },
  { match: "/admin/orders", label: "订单" },
  { match: "/admin/revenue", label: "收入" },
  { match: "/admin/billing", label: "计费" },
  { match: "/admin/notifications", label: "通知" },
  { match: "/admin/logs", label: "审计日志" },
  { match: "/admin/users", label: "用户" },
  { match: "/admin/support", label: "客服支持" },
  { match: "/admin/branding", label: "品牌素材" },
  { match: "/admin/email-settings", label: "邮件设置" },
  { match: "/admin/email-jobs", label: "邮件任务" },
  { match: "/admin/tracking", label: "追踪设置" },
  { match: "/admin/members", label: "后台成员" },
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
  const { adminRole, permissions, routePatterns, homePath, session } = useAdminAuth();
  const roleLabel = getAdminRoleLabel(adminRole);
  const effectiveHomePath = homePath || "/admin";

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(new Set(["/admin/series"]));
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const visibleNavGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items
          .map((item) => ({
            ...item,
            children: Array.isArray(item.children)
              ? item.children.filter((child) => canAccessAdminRoute(child.href, routePatterns))
              : item.children,
          }))
          .filter((item) => canAccessAdminRoute(item.href, routePatterns)),
      })).filter((group) => group.items.length > 0),
    [routePatterns],
  );

  const activeGroupLabel = useMemo(() => {
    const group = visibleNavGroups.find((item) =>
      item.items.some((navItem) =>
        navItem.exact
          ? pathname === navItem.href
          : navItem.match?.some((prefix) => pathname.startsWith(prefix)),
      ),
    );

    return group?.label || "工作台";
  }, [pathname, visibleNavGroups]);

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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white" />

      <div className="relative flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[color:var(--gush-border)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.04)] transition-all duration-300 lg:relative",
            isCollapsed ? "w-[92px]" : "w-[284px]",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-[color:var(--gush-border)] px-4 py-5">
              <div className="flex items-start justify-between gap-3">
                <Link href={effectiveHomePath} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[color:var(--gush-border)] bg-white text-sm font-semibold tracking-[0.18em] text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
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
                  className="hidden h-10 w-10 items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white text-slate-500 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950 lg:flex"
                  aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
                >
                  {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
              </div>

              {!isCollapsed ? (
                <div className="mt-4 rounded-[24px] border border-[color:var(--gush-border)] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    当前分区
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{activeGroupLabel}</p>
                </div>
              ) : null}
            </div>

            <div className="px-4 py-4">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-full border border-[color:var(--gush-border)] bg-white px-4 text-left text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.035)] transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950",
                  isCollapsed ? "justify-center px-0" : "",
                )}
              >
                <Search size={17} className="shrink-0 text-slate-500" />
                {!isCollapsed ? (
                  <>
                    <span className="flex-1">搜索后台页面</span>
                    <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      Ctrl+K
                    </span>
                  </>
                ) : null}
              </button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
              {visibleNavGroups.map((group) => (
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
                        "border-[color:var(--gush-border-strong)] bg-white text-slate-950 shadow-[0_12px_28px_rgba(15,23,42,0.045)]";
                      const idleClass =
                        "border-transparent text-slate-600 hover:border-[color:var(--gush-border)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950";

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
                                className={cn("shrink-0", isActive ? "text-slate-950" : "text-slate-400")}
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
                                className={cn("shrink-0", isActive ? "text-slate-950" : "text-slate-400")}
                              />
                              {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
                              {isActive && !isCollapsed ? (
                                <span className="ml-auto h-2 w-2 rounded-full bg-[color:var(--gush-accent)] shadow-[0_0_0_4px_rgba(0,113,227,0.12)]" />
                              ) : null}
                            </Link>
                          )}

                          {hasChildren && isExpanded && !isCollapsed ? (
                            <div className="mt-1 ml-6 space-y-1 border-l border-[color:var(--gush-border)] pl-3">
                              {item.children.map((child) => {
                                const childIsActive = isChildLinkActive(pathname, searchParams, child.href);

                                return (
                                  <Link
                                    key={child.label}
                                    href={child.href}
                                    className={cn(
                                      "group flex items-center gap-2 rounded-[16px] px-3 py-2 text-xs font-medium transition-all duration-200",
                                      childIsActive
                                        ? "bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]"
                                        : "text-slate-500 hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950",
                                    )}
                                  >
                                    <span className="truncate">{child.label}</span>
                                    {childIsActive ? (
                                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[color:var(--gush-accent)] shadow-[0_0_0_4px_rgba(0,113,227,0.12)]" />
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
              <div className="border-t border-[color:var(--gush-border)] p-4">
                <div className="rounded-[24px] border border-[color:var(--gush-border)] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    当前会话
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {session?.adminName || roleLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {session?.adminEmail || roleLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1">
                      {visibleNavGroups.length} 个工作分区
                    </span>
                    <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1">
                      {permissions.length} 项权限
                    </span>
                    {session?.keySlot ? (
                      <span className="rounded-full border border-[color:var(--gush-border)] bg-white px-2.5 py-1">
                        密钥槽位 {session.keySlot}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        {isMobileMenuOpen ? (
          <div
            className="fixed inset-0 z-40 bg-white/80 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-[color:var(--gush-border)] bg-white/95 shadow-[0_10px_24px_rgba(15,23,42,0.035)] backdrop-blur-2xl">
            <div className="mx-auto flex w-[min(var(--gush-page-max-wide),calc(100%-2rem))] flex-col gap-4 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen((current) => !current)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--gush-border)] bg-white text-slate-600 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950 lg:hidden"
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

              <div className="flex w-full flex-wrap items-center justify-end gap-2 xl:w-auto xl:max-w-[48rem]">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="hidden h-11 items-center gap-2 rounded-full border border-[color:var(--gush-border)] bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.035)] transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950 md:flex"
                >
                  <Search size={16} className="text-slate-500" />
                  <span>搜索</span>
                  <kbd className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Ctrl+K
                  </kbd>
                </button>
                {actions ? (
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 xl:w-auto">
                    {actions}
                  </div>
                ) : null}
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

      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        routePatterns={routePatterns}
        homePath={effectiveHomePath}
      />
    </div>
  );
}
