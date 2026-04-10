"use client";

import {
  AdminBadge,
  AdminFormField,
  adminInputClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

export function SlotIdentity({ slotMeta, itemId = "", hint = "" }) {
  const resolvedHint = hint || slotMeta.hint;

  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold text-slate-950">{slotMeta.label}</div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 font-mono text-slate-600">
          {slotMeta.token}
        </span>
        {itemId ? (
          <span className="rounded-full border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-3 py-1 font-mono text-slate-500">
            {itemId}
          </span>
        ) : null}
      </div>
      {resolvedHint ? <p className="text-sm leading-6 text-slate-600">{resolvedHint}</p> : null}
    </div>
  );
}

export function RecommendationCard({ title, description, meta = null, footer = null, children }) {
  return (
    <article className="rounded-[26px] border border-[color:var(--gush-border)] bg-white/86 p-5 shadow-[var(--gush-shadow-soft)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {meta}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
      {footer ? <div className="mt-4 border-t border-[color:var(--gush-border)] pt-4">{footer}</div> : null}
    </article>
  );
}

export function CreateSlotModalContent({
  slotForm,
  setSlotForm,
  selectedSlotMeta,
  storefrontPresets,
  onPresetChange,
  onSubmit,
  isPending,
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <AdminFormField
        label="推荐位预设"
        helperText={selectedSlotMeta.hint || "先从已有推荐位预设开始，减少接线和命名错误。"}
      >
        <select
          id="slot-preset"
          value={slotForm.preset}
          onChange={(event) => onPresetChange(event.target.value)}
          className={adminSelectClassName}
        >
          {storefrontPresets.map((preset) => (
            <option key={preset.token} value={preset.token}>
              {preset.label}
            </option>
          ))}
        </select>
      </AdminFormField>

      <AdminFormField
        label="系统标识"
        helperText={
          slotForm.preset === "custom" ? "只使用小写字母、数字和短横线。" : "这个标识会根据预设自动填入。"
        }
      >
        <input
          id="slot-token"
          type="text"
          value={slotForm.slotToken}
          readOnly={slotForm.preset !== "custom"}
          onChange={(event) => setSlotForm((current) => ({ ...current, slotToken: event.target.value }))}
          placeholder="例如：library-return"
          className={adminInputClassName}
        />
      </AdminFormField>

      <AdminFormField label="作品 ID" helperText="多个作品 ID 可用逗号或换行分隔。">
        <textarea
          id="slot-series-ids"
          rows={5}
          value={slotForm.seriesIdsText}
          onChange={(event) => setSlotForm((current) => ({ ...current, seriesIdsText: event.target.value }))}
          placeholder={"series_001\nseries_002"}
          className={adminTextareaClassName}
        />
      </AdminFormField>

      <Button type="submit" disabled={isPending}>
        {isPending ? "创建中..." : "创建推荐位"}
      </Button>
    </form>
  );
}

export function CreateRankingModalContent({
  rankingForm,
  setRankingForm,
  rankingTypeOptions,
  timeRangeOptions,
  seriesTypeOptions,
  onSubmit,
  isPending,
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <AdminFormField label="榜单名称">
          <input
            id="ranking-name"
            type="text"
            value={rankingForm.name}
            onChange={(event) => setRankingForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="例如：weekly-trending"
            className={adminInputClassName}
          />
        </AdminFormField>
        <AdminFormField label="榜单类型" helperText="这里只保留当前仍建议新建的榜单策略；旧规则只会作为历史配置显示。">
          <select
            id="ranking-type"
            value={rankingForm.rankingType}
            onChange={(event) => setRankingForm((current) => ({ ...current, rankingType: event.target.value }))}
            className={adminSelectClassName}
          >
            {rankingTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
        <AdminFormField label="时间范围">
          <select
            id="ranking-range"
            value={rankingForm.timeRange}
            onChange={(event) => setRankingForm((current) => ({ ...current, timeRange: event.target.value }))}
            className={adminSelectClassName}
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
        <AdminFormField label="作品类型">
          <select
            id="ranking-series-type"
            value={rankingForm.seriesType}
            onChange={(event) => setRankingForm((current) => ({ ...current, seriesType: event.target.value }))}
            className={adminSelectClassName}
          >
            {seriesTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AdminFormField>
        <AdminFormField label="最大作品数">
          <input
            id="ranking-max-items"
            type="number"
            min="1"
            max="200"
            value={rankingForm.maxItems}
            onChange={(event) => setRankingForm((current) => ({ ...current, maxItems: event.target.value }))}
            className={adminInputClassName}
          />
        </AdminFormField>
        <div className="grid gap-3">
          <label className="flex items-center justify-between rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-700">
            <span>允许 18+ 内容</span>
            <input
              type="checkbox"
              checked={rankingForm.adult}
              onChange={(event) => setRankingForm((current) => ({ ...current, adult: event.target.checked }))}
              className="h-4 w-4 rounded border-black/20 bg-transparent"
            />
          </label>
          <label className="flex items-center justify-between rounded-[22px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-700">
            <span>规则启用中</span>
            <input
              type="checkbox"
              checked={rankingForm.active}
              onChange={(event) => setRankingForm((current) => ({ ...current, active: event.target.checked }))}
              className="h-4 w-4 rounded border-black/20 bg-transparent"
            />
          </label>
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "创建中..." : "创建榜单规则"}
      </Button>
    </form>
  );
}

export function DeleteRecommendationContent({ deleteTarget, onCancel, onConfirm, isBusy }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">
        {deleteTarget?.kind === "slot"
          ? `确定删除推荐位“${deleteTarget?.item?.name || deleteTarget?.item?.slot || "未知"}”吗？`
          : `确定删除榜单规则“${deleteTarget?.item?.name || deleteTarget?.item?.ranking || "未知"}”吗？`}
      </p>
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isBusy}>
          取消
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={isBusy}>
          {isBusy ? "删除中..." : "删除"}
        </Button>
      </div>
    </div>
  );
}
