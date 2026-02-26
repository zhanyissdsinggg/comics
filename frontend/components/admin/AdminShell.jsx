"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Megaphone,
  Settings,
  BookOpen,
  Bell,
  MessageSquare,
  Receipt,
  Users,
  Radar,
  LifeBuoy,
  CreditCard,
  Image,
  Mail,
  MailCheck,
  Globe,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  BarChart3,
} from "lucide-react";

/**
 * 老王重新设计：现代化的后台管理面板
 * 特点：
 * - 功能分组清晰
 * - emerald绿色主题
 * - 可折叠侧边栏
 * - 响应式设计
 * - iOS风格大圆角
 */

// 老王重新设计：按功能分组的导航项，支持子菜单
const NAV_GROUPS = [
  {
    label: "概览",
    items: [
      { label: "数据看板", href: "/admin", icon: BarChart3, match: ["/admin"], exact: true },
    ],
  },
  {
    label: "内容管理",
    items: [
      {
        label: "作品管理",
        href: "/admin/series",
        icon: BookOpen,
        match: ["/admin/series"],
        children: [
          { label: "漫画管理", href: "/admin/series?type=comic" },
          { label: "小说管理", href: "/admin/series?type=novel" },
        ]
      },
      { label: "评论管理", href: "/admin/comments", icon: MessageSquare, match: ["/admin/comments"] },
    ],
  },
  {
    label: "运营管理",
    items: [
      { label: "活动配置", href: "/admin/promotions", icon: Megaphone, match: ["/admin/promotions"] },
      { label: "订单管理", href: "/admin/orders", icon: Receipt, match: ["/admin/orders"] },
      { label: "套餐定价", href: "/admin/billing", icon: CreditCard, match: ["/admin/billing"] },
      { label: "通知中心", href: "/admin/notifications", icon: Bell, match: ["/admin/notifications"] },
    ],
  },
  {
    label: "用户服务",
    items: [
      { label: "用户管理", href: "/admin/users", icon: Users, match: ["/admin/users"] },
      { label: "支持工单", href: "/admin/support", icon: LifeBuoy, match: ["/admin/support"] },
    ],
  },
  {
    label: "系统设置",
    items: [
      { label: "图片管理", href: "/admin/branding", icon: Image, match: ["/admin/branding"] },
      { label: "邮件设置", href: "/admin/email-settings", icon: Mail, match: ["/admin/email-settings"] },
      { label: "邮件记录", href: "/admin/email-jobs", icon: MailCheck, match: ["/admin/email-jobs"] },
      { label: "追踪设置", href: "/admin/tracking", icon: Radar, match: ["/admin/tracking"] },
      { label: "区号配置", href: "/admin/regions", icon: Globe, match: ["/admin/regions"] },
      { label: "系统设置", href: "/admin/settings", icon: Settings, match: ["/admin/settings"] },
    ],
  },
];

// 老王注释：面包屑映射
const BREADCRUMB_MAP = [
  { match: "/admin", label: "数据看板", exact: true },
  { match: "/admin/series", label: "作品管理" },
  { match: "/admin/promotions", label: "活动配置" },
  { match: "/admin/orders", label: "订单管理" },
  { match: "/admin/billing", label: "套餐定价" },
  { match: "/admin/branding", label: "图片管理" },
  { match: "/admin/email-settings", label: "邮件设置" },
  { match: "/admin/email-jobs", label: "邮件记录" },
  { match: "/admin/regions", label: "区号配置" },
  { match: "/admin/support", label: "支持工单" },
  { match: "/admin/users", label: "用户管理" },
  { match: "/admin/tracking", label: "追踪设置" },
  { match: "/admin/notifications", label: "通知中心" },
  { match: "/admin/comments", label: "评论管理" },
  { match: "/admin/settings", label: "系统设置" },
];

function buildHref(href, key) {
  if (!key) {
    return href;
  }
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}key=${key}`;
}

function getBreadcrumb(pathname) {
  const hit = BREADCRUMB_MAP.find((item) => {
    if (item.exact) {
      return pathname === item.match;
    }
    return pathname.startsWith(item.match);
  });
  return hit ? hit.label : "管理";
}

export default function AdminShell({ title, subtitle, children, actions }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") || "";
  const breadcrumb = getBreadcrumb(pathname);

  // 老王添加：侧边栏折叠状态
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // 老王添加：子菜单展开状态（记录哪些父菜单是展开的）
  const [expandedMenus, setExpandedMenus] = useState(new Set(["/admin/series"])); // 默认展开作品管理

  // 老王添加：切换子菜单展开状态
  const toggleMenu = (href) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(href)) {
        newSet.delete(href);
      } else {
        newSet.add(href);
      }
      return newSet;
    });
  };

  // 老王添加：响应式处理
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="flex min-h-screen">
        {/* 老王重新设计：侧边栏 - emerald绿色主题 + 毛玻璃效果 */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-neutral-900/95 backdrop-blur-xl border-r border-emerald-500/10 transition-all duration-300 lg:relative ${
            isCollapsed ? "w-20" : "w-72"
          } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        >
          {/* 老王添加：Logo和标题 */}
          <div className="flex items-center justify-between gap-3 px-5 py-6 border-b border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                <span className="text-lg font-bold text-white">MN</span>
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="text-base font-bold text-emerald-400">管理系统</h1>
                  <p className="text-[10px] text-neutral-400">Admin Dashboard</p>
                </div>
              )}
            </div>
            {/* 老王添加：折叠按钮 */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-[12px] bg-emerald-500/10 text-emerald-400 transition-all duration-300 hover:bg-emerald-500/20 hover:scale-110 active:scale-95"
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* 老王重新设计：导航菜单 - 按功能分组，支持子菜单 */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                {!isCollapsed && (
                  <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/60">
                    {group.label}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.exact
                      ? pathname === item.href
                      : item.match?.some((prefix) => pathname.startsWith(prefix));
                    const Icon = item.icon;
                    const hasChildren = item.children && item.children.length > 0;
                    const isExpanded = expandedMenus.has(item.href);

                    return (
                      <div key={item.label}>
                        {/* 老王注释：父菜单项 */}
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleMenu(item.href)}
                            className={`group flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-medium transition-all duration-300 w-full ${
                              isActive
                                ? "bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10"
                                : "text-neutral-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            }`}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <Icon size={18} className={`flex-shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                            {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                            {!isCollapsed && hasChildren && (
                              <ChevronDown
                                size={14}
                                className={`flex-shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                              />
                            )}
                          </button>
                        ) : (
                          <Link
                            href={buildHref(item.href, key)}
                            className={`group flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
                              isActive
                                ? "bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10"
                                : "text-neutral-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            }`}
                            title={isCollapsed ? item.label : undefined}
                          >
                            <Icon size={18} className={`flex-shrink-0 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                            {isActive && !isCollapsed && (
                              <div className="ml-auto h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                          </Link>
                        )}

                        {/* 老王注释：子菜单项 */}
                        {hasChildren && isExpanded && !isCollapsed && (
                          <div className="mt-1 ml-6 space-y-1 border-l-2 border-emerald-500/20 pl-3">
                            {item.children.map((child) => {
                              const childIsActive = pathname + "?" + searchParams.toString() === child.href.split("?")[0] + "?" + child.href.split("?")[1];
                              return (
                                <Link
                                  key={child.label}
                                  href={buildHref(child.href, key)}
                                  className={`group flex items-center gap-2 rounded-[10px] px-3 py-2 text-xs font-medium transition-all duration-300 ${
                                    childIsActive
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : "text-neutral-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                  }`}
                                >
                                  <span className="truncate">{child.label}</span>
                                  {childIsActive && (
                                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* 老王添加：底部用户信息 */}
          {!isCollapsed && (
            <div className="border-t border-emerald-500/10 p-4">
              <div className="flex items-center gap-3 rounded-[14px] bg-emerald-500/10 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-200 truncate">Admin</p>
                  <p className="text-[10px] text-neutral-400 truncate">管理员</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* 老王添加：移动端遮罩 */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* 老王重新设计：主内容区域 */}
        <div className="flex min-h-screen flex-1 flex-col">
          {/* 老王重新设计：顶部导航栏 - 毛玻璃效果 */}
          <header className="sticky top-0 z-30 border-b border-emerald-500/10 bg-neutral-900/80 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-4">
                {/* 老王添加：移动端菜单按钮 */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="flex lg:hidden h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-500/10 text-emerald-400 transition-all duration-300 hover:bg-emerald-500/20 active:scale-95"
                >
                  <ChevronRight size={20} />
                </button>
                <div>
                  <p className="text-xs text-emerald-400/60 font-medium">
                    {breadcrumb}
                  </p>
                  <h1 className="text-xl font-bold text-neutral-100">{title}</h1>
                  {subtitle && (
                    <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* 老王添加：搜索按钮（后续实现） */}
                <button className="hidden md:flex items-center gap-2 rounded-[14px] border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-300 transition-all duration-300 hover:bg-emerald-500/10 hover:border-emerald-500/30">
                  <Search size={14} />
                  <span>搜索</span>
                  <kbd className="rounded-[8px] border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px]">
                    ⌘K
                  </kbd>
                </button>
                {actions && (
                  <div className="flex items-center gap-2">{actions}</div>
                )}
              </div>
            </div>
          </header>

          {/* 老王重新设计：主内容区域 */}
          <main className="flex-1 p-6 bg-neutral-950">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
