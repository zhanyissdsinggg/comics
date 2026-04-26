"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, LifeBuoy, PenSquare, Sparkles } from "lucide-react";

import SurfacePanel from "@/components/common/SurfacePanel";

import {
  PENDING_ITEMS,
  QUICK_ACTIONS,
  formatDate,
  formatOrderState,
  formatSeriesState,
  formatTicketState,
  getSeriesBadge,
  number,
  relativeTime,
  safeNumber,
  safeText,
  usd,
} from "./utils";
import { resolveSeriesCreatorIdentity } from "../../../lib/creatorIdentity";
import { EmptyBlock, QueueItem, SectionHeader } from "./blocks";

const ACTION_ICONS = {
  series: BookOpen,
  creators: PenSquare,
  support: LifeBuoy,
  merchandising: Sparkles,
};

export function PendingItemsSection({ insights }) {
  return (
    <SurfacePanel appearance="light" accent="blue">
      <SectionHeader
        title="待处理事项"
        description="把会拖慢上架和前台观感的问题优先清掉。"
        eyebrow="今日优先"
      />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {PENDING_ITEMS.map((item) => (
          <Link
            key={item.key}
            href="/admin/series"
            className="rounded-[24px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02] transition hover:-translate-y-[1px] hover:shadow-[0_16px_34px_rgba(15,23,42,0.05)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {item.label}
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-[1.85rem] font-semibold tracking-tight text-slate-950">
                {number.format(insights[item.key])}
              </p>
              <ArrowRight className="size-4 text-slate-400" />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            <p className="mt-3 text-xs font-medium text-slate-500">点进去直接处理对应作品。</p>
          </Link>
        ))}
      </div>
    </SurfacePanel>
  );
}

export function LatestSeriesSection({ latestUpdated }) {
  return (
    <SurfacePanel appearance="light" accent="blue">
      <SectionHeader
        title="最近更新的作品"
        description="更新过的作品先看资料完整度，再决定要不要推到前台。"
        eyebrow="作品跟进"
      />
      <div className="mt-5 space-y-3">
        {latestUpdated.length > 0 ? (
          latestUpdated.map((series) => {
            const creatorReady = resolveSeriesCreatorIdentity(series).hasPublicCredit;
            const missing = [
              !creatorReady && "署名待补",
              !safeText(series?.coverUrl || series?.coverImage) && "封面待补",
              safeNumber(series?.episodeCount ?? series?._count?.episodes ?? series?.totalEpisodes, 0) === 0 &&
                "无章节",
            ]
              .filter(Boolean)
              .join(" / ");

            return (
              <QueueItem
                key={series.id}
                title={safeText(series.title) || "未命名作品"}
                detail={`${series?.type === "novel" ? "小说" : "漫画"} · ${formatSeriesState(series)}${missing ? ` · ${missing}` : ""}`}
                meta={`${formatDate(series.updatedAt)} · ${relativeTime(series.updatedAt)}`}
                badge={getSeriesBadge(series)}
                tone={missing ? "warning" : "success"}
              />
            );
          })
        ) : (
          <EmptyBlock title="还没有作品目录数据" description="没有作品列表。" />
        )}
      </div>
    </SurfacePanel>
  );
}

export function QuickActionsSection() {
  return (
    <SurfacePanel appearance="light" accent="amber">
      <SectionHeader
        title="快捷入口"
        description="把常用运营动作收在一处，少跳页面。"
        eyebrow="高频动作"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {QUICK_ACTIONS.map((item) => {
          const Icon = ACTION_ICONS[item.icon];

          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`admin-dashboard-quick-${item.icon}`}
              className="group flex min-h-[110px] items-start gap-4 rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition hover:border-[color:var(--gush-border-strong)] hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(15,23,42,0.05)]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-[color:var(--gush-border)] bg-white text-slate-950">
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                <p className="mt-3 text-xs font-medium text-slate-500">进入后可继续编辑和复核。</p>
              </div>
            </Link>
          );
        })}
      </div>
    </SurfacePanel>
  );
}

export function SupportQueueSection({ support }) {
  return (
    <SurfacePanel appearance="light" accent="cyan">
      <SectionHeader
        title="客服队列"
        description="优先处理刚更新的对话，避免读者等待过久。"
        eyebrow="支持中心"
        action={
          <Link
            href="/admin/support"
            data-testid="admin-dashboard-support-view-all"
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            查看全部
          </Link>
        }
      />
      <div className="mt-5 space-y-3">
        {support.length > 0 ? (
          support.map((ticket) => (
            <QueueItem
              key={ticket.id}
              title={safeText(ticket.subject || ticket.topic) || "未命名工单"}
              detail={safeText(ticket.userEmail || ticket.replyEmail || ticket.userId) || "未记录联系信息"}
              meta={`${formatTicketState(ticket.status)} · ${relativeTime(ticket.updatedAt || ticket.createdAt)}`}
              badge={formatTicketState(ticket.status)}
              tone={ticket.status === "open" || ticket.status === "pending" ? "warning" : "accent"}
            />
          ))
        ) : (
          <EmptyBlock title="当前没有客服队列" description="没有新工单。" />
        )}
      </div>
    </SurfacePanel>
  );
}

export function OrdersQueueSection({ orders }) {
  return (
    <SurfacePanel appearance="light" accent="rose">
      <SectionHeader
        title="最近订单"
        description="这里只放最新订单，方便快速确认异常和退款类问题。"
        eyebrow="交易跟进"
        action={
          <Link
            href="/admin/orders"
            data-testid="admin-dashboard-orders-view-all"
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            查看全部
          </Link>
        }
      />
      <div className="mt-5 space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => (
            <QueueItem
              key={safeText(order.id || order.orderId) || `${order.userId}-${order.createdAt}`}
              title={safeText(order.orderId || order.id) || "未命名订单"}
              detail={`${safeText(order.userId) || "未记录用户"} · ${usd.format(safeNumber(order?.amount))}`}
              meta={`${formatOrderState(order.status)} · ${relativeTime(order.createdAt)}`}
              badge={formatOrderState(order.status)}
              tone={order.status === "paid" || order.status === "completed" ? "success" : "warning"}
            />
          ))
        ) : (
          <EmptyBlock title="当前没有订单记录" description="没有真实订单。" />
        )}
      </div>
    </SurfacePanel>
  );
}

export function CommentsQueueSection({ comments }) {
  return (
    <SurfacePanel appearance="light" accent="emerald">
      <SectionHeader
        title="最新评论"
        description="先看最新反馈，判断是否需要隐藏或继续跟进。"
        eyebrow="读者反馈"
        action={
          <Link
            href="/admin/comments"
            data-testid="admin-dashboard-comments-view-all"
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            查看全部
          </Link>
        }
      />
      <div className="mt-5 space-y-3">
        {comments.length > 0 ? (
          comments.slice(0, 5).map((comment) => (
            <QueueItem
              key={comment.id}
              title={safeText(comment.author) || "匿名读者"}
              detail={safeText(comment.text).slice(0, 72) || "没有可显示的评论内容"}
              meta={relativeTime(comment.createdAt)}
              badge={comment.hidden ? "已隐藏" : "已显示"}
              tone={comment.hidden ? "warning" : "success"}
            />
          ))
        ) : (
          <EmptyBlock title="当前没有评论列表" description="没有评论。" />
        )}
      </div>
    </SurfacePanel>
  );
}
