"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  Eye,
  Search,
  Users,
} from "lucide-react";

import SurfacePanel from "@/components/common/SurfacePanel";

import {
  formatDateLabel,
  formatPercent,
  formatSeriesStatusLabel,
  getSeriesMetadataSummary,
} from "./utils";
import { ActionButton, EmptyState, StatusPill } from "./blocks";

const contentCardClassName =
  "rounded-[24px] border border-[color:var(--gush-border)] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(15,23,42,0.035)] ring-1 ring-black/[0.02]";

const actionTrayClassName = "flex w-full flex-wrap gap-2";

const primaryActionClassName =
  "border-[color:var(--gush-border-strong)] bg-[linear-gradient(180deg,#ffffff,#f5f5f7)] text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.035)]";

const metricTileClassName =
  "rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]";

export function NamingRiskSection({
  namingRiskPreview,
  handleOpenSeries,
  handleCopyCreatorName,
  copyFeedback,
}) {
  return (
    <SurfacePanel appearance="light" accent="amber" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">命名清理</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            先把同一位创作者的名字收成一个版本。
          </p>
        </div>
        <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
      </div>

      {namingRiskPreview.length === 0 ? (
        <EmptyState title="当前没有命名冲突" description="当前命名状态稳定。" />
      ) : (
        <div className="space-y-3">
          {namingRiskPreview.map((creator) => (
            <div
              key={creator.slug}
              className={contentCardClassName}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-950">{creator.name}</p>
                    <StatusPill tone="amber">发现 {creator.variants.length} 种写法</StatusPill>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    关联 {creator.titleCount} 部作品，已发布 {creator.publishedCount} 部，草稿 {creator.unpublishedCount} 部。
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {creator.variants.map((variant) => (
                      <StatusPill key={`${creator.slug}-${variant}`} tone="slate">
                        {variant}
                      </StatusPill>
                    ))}
                  </div>
                </div>

                <div className={actionTrayClassName}>
                  <ActionButton
                    onClick={() => handleOpenSeries(creator.spotlightSeries?.id)}
                    className={primaryActionClassName}
                  >
                    <Edit3 className="h-4 w-4" />
                    编辑代表作品
                  </ActionButton>
                  <ActionButton onClick={() => handleCopyCreatorName(creator)}>
                    <Copy className="h-4 w-4" />
                    {copyFeedback.slug === creator.slug && copyFeedback.type === "success"
                      ? "已复制"
                      : "复制规范名称"}
                  </ActionButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SurfacePanel>
  );
}

export function MissingCreditsSection({ missingCreatorPreview, handleOpenSeries }) {
  return (
    <SurfacePanel appearance="light" accent="cyan" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
            缺少创作者署名的作品
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            这些作品前台还拿不到真实署名。
          </p>
        </div>
        <Users className="mt-1 h-5 w-5 text-cyan-500" />
      </div>

      {missingCreatorPreview.length === 0 ? (
        <EmptyState title="当前没有缺失署名" description="当前作品都已有可用署名。" />
      ) : (
        <div className="space-y-3">
          {missingCreatorPreview.map((series) => (
            <div
              key={series.id}
              className={`${contentCardClassName} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-slate-950">{series.title}</p>
                  <StatusPill tone="slate">{series.id}</StatusPill>
                  <StatusPill tone={series.isPublished ? "emerald" : "amber"}>
                    {series.isPublished ? "已发布" : "草稿"}
                  </StatusPill>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {series.type === "novel" ? "小说" : "漫画"} | {formatSeriesStatusLabel(series.status)} |
                  更新于 {formatDateLabel(series.updatedAt)}
                </p>
              </div>

              <ActionButton
                onClick={() => handleOpenSeries(series.id)}
                className={primaryActionClassName}
              >
                <Edit3 className="h-4 w-4" />
                补创作者署名
              </ActionButton>
            </div>
          ))}
        </div>
      )}
    </SurfacePanel>
  );
}

export function LegacyAuthorSection({ legacyAuthorPreview, handleOpenSeries }) {
  return (
    <SurfacePanel appearance="light" accent="amber" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">
            旧 author 兼容层
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            这些作品还没迁进 Creator / SeriesCredit。
          </p>
        </div>
        <BookOpen className="mt-1 h-5 w-5 text-amber-500" />
      </div>

      {legacyAuthorPreview.length === 0 ? (
        <EmptyState title="当前没有兼容层残留" description="署名已经不再依赖旧 author 字段。" />
      ) : (
        <div className="space-y-3">
          {legacyAuthorPreview.map((series) => (
            <div
              key={`legacy-author-${series.id}`}
              className={`${contentCardClassName} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-slate-950">{series.title}</p>
                  <StatusPill tone="slate">{series.id}</StatusPill>
                  <StatusPill tone="amber">旧 author 兼容层</StatusPill>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  当前署名：<span className="font-medium text-slate-950">{series.author || "未填写"}</span>
                  {" | "}
                  {series.type === "novel" ? "小说" : "漫画"} | {formatSeriesStatusLabel(series.status)}
                </p>
              </div>

              <ActionButton
                onClick={() => handleOpenSeries(series.id)}
                className={primaryActionClassName}
              >
                <Edit3 className="h-4 w-4" />
                迁到真实 credits
              </ActionButton>
            </div>
          ))}
        </div>
      )}
    </SurfacePanel>
  );
}

export function CreatorDirectorySection({
  filteredCreators,
  expandedCreators,
  audit,
  handleOpenSeries,
  handleOpenSeriesLibraryByCreator,
  handleCopyCreatorName,
  handleOpenCreator,
  handleOpenStorefrontSeries,
  handleToggleCreatorExpanded,
  copyFeedback,
}) {
  return (
    <SurfacePanel appearance="light" accent="blue" className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950">创作者目录</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            在一个地方看覆盖率、命名状态和前台路径。
          </p>
        </div>
        <p className="text-sm text-slate-500">
          草稿 {audit.stats.unpublishedSeriesCount} 部，命名风险 {audit.stats.namingRiskCreatorCount} 处
        </p>
      </div>

      {filteredCreators.length === 0 ? (
        <EmptyState
          title="当前筛选下没有匹配的创作者条目"
          description="清空搜索词，或切回“全部创作者”查看完整目录。"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredCreators.map((creator) => {
            const isExpanded = expandedCreators.includes(creator.slug);

            return (
              <article
                key={creator.slug}
                className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[1.3rem] font-semibold tracking-tight text-slate-950">
                        {creator.name}
                      </h3>
                      <StatusPill tone={creator.hasNamingRisk ? "amber" : "emerald"}>
                        {creator.hasNamingRisk ? "命名待清理" : "命名稳定"}
                      </StatusPill>
                    </div>

                    <p className="text-sm leading-6 text-slate-600">
                      代表作品：{creator.spotlightSeries?.title || "暂未设置"} | 前台已就绪 {creator.readySeriesCount} 部 |
                      最近更新于 {formatDateLabel(creator.latestUpdatedAt)}
                    </p>

                    {creator.topGenres.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {creator.topGenres.map((genre) => (
                          <StatusPill key={`${creator.slug}-${genre}`} tone="slate">
                            {genre}
                          </StatusPill>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
                    <div className={metricTileClassName}>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        作品数
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{creator.titleCount}</p>
                    </div>
                    <div className={metricTileClassName}>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        资料完整度
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {formatPercent(creator.metadataCoverageScore)}
                      </p>
                    </div>
                    <div className={metricTileClassName}>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        已发布
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{creator.publishedCount}</p>
                    </div>
                    <div className={metricTileClassName}>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        前台已就绪
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{creator.readySeriesCount}</p>
                    </div>
                  </div>
                </div>

                {creator.variants.length > 1 ? (
                  <div className="mt-4 rounded-[24px] border border-amber-200 bg-white px-4 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.025)] ring-1 ring-black/[0.015]">
                    <p className="text-sm font-semibold text-amber-900">
                      建议合并成一个稳定的公开名称：
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {creator.variants.map((variant) => (
                        <StatusPill key={`${creator.slug}-variant-${variant}`} tone="amber">
                          {variant}
                        </StatusPill>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <ActionButton
                    onClick={() => handleOpenSeries(creator.spotlightSeries?.id)}
                    className={primaryActionClassName}
                  >
                    <Edit3 className="h-4 w-4" />
                    编辑代表作品
                  </ActionButton>
                  <ActionButton onClick={() => handleOpenSeriesLibraryByCreator(creator.name)}>
                    <Search className="h-4 w-4" />
                    在作品库中搜索
                  </ActionButton>
                  <ActionButton onClick={() => handleCopyCreatorName(creator)}>
                    <Copy className="h-4 w-4" />
                    {copyFeedback.slug === creator.slug && copyFeedback.type === "success"
                      ? "已复制"
                      : "复制规范名称"}
                  </ActionButton>
                  <ActionButton onClick={() => handleOpenCreator(creator.path)}>
                    <Eye className="h-4 w-4" />
                    打开前台创作者页
                  </ActionButton>
                  {creator.spotlightSeries?.id ? (
                    <ActionButton onClick={() => handleOpenStorefrontSeries(creator.spotlightSeries.id)}>
                      <ArrowUpRight className="h-4 w-4" />
                      查看前台代表作品
                    </ActionButton>
                  ) : null}
                  <ActionButton onClick={() => handleToggleCreatorExpanded(creator.slug)}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {isExpanded ? "收起关联作品" : `查看关联作品（${creator.titleCount}）`}
                  </ActionButton>
                </div>

                {isExpanded ? (
                  <div className="mt-4 rounded-[24px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)] ring-1 ring-black/[0.02]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                      <p className="text-sm font-semibold text-slate-950">关联作品</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                          继续核对作品级署名和前台页。
                      </p>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        共 {creator.series.length} 部
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {creator.series.map((series) => (
                        <div
                          key={`${creator.slug}-${series.id}`}
                          className="flex flex-col gap-3 rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4 xl:flex-row xl:items-center xl:justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-slate-950">{series.title}</p>
                              <StatusPill tone="slate">{series.id}</StatusPill>
                              <StatusPill tone={series.isPublished ? "emerald" : "amber"}>
                                {series.isPublished ? "已发布" : "草稿"}
                              </StatusPill>
                            </div>
                            <p className="text-sm leading-6 text-slate-600">
                              {series.type === "novel" ? "小说" : "漫画"} | {formatSeriesStatusLabel(series.status)} |
                              更新于 {formatDateLabel(series.updatedAt)}
                            </p>
                            <p className="text-sm leading-6 text-slate-600">
                              资料状态：<span className="text-slate-950">{getSeriesMetadataSummary(series)}</span>
                            </p>
                          </div>

                          <div className="flex w-full flex-wrap gap-2">
                            <ActionButton onClick={() => handleOpenSeries(series.id)} className={primaryActionClassName}>
                              <Edit3 className="h-4 w-4" />
                              编辑作品
                            </ActionButton>
                            {series.isPublished ? (
                              <ActionButton onClick={() => handleOpenStorefrontSeries(series.id)}>
                                <ArrowUpRight className="h-4 w-4" />
                                查看前台页
                              </ActionButton>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </SurfacePanel>
  );
}
