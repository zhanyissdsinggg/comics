"use client";

import { AdminFeedbackBanner } from "@/components/admin/common/AdminFeedbackBanner";
import {
  AdminBadge,
  AdminFormField,
  AdminMetricCard,
  AdminPageSection,
  adminInputClassName,
} from "@/components/admin/common/AdminWorkspacePrimitives";
import { Button } from "@/components/ui/button";

import { buildGeneratorChecklist, buildGeneratorMetricCards } from "./utils";

export function GeneratorSummaryCards({ estimatedSeriesTotal, previewMinEpisodes, previewMaxEpisodes }) {
  const cards = buildGeneratorMetricCards({
    estimatedSeriesTotal,
    previewMinEpisodes,
    previewMaxEpisodes,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <AdminMetricCard key={card.label} {...card} />
      ))}
    </div>
  );
}

export function GeneratorFormSection({
  form,
  onUpdateField,
  onGenerate,
  generating,
  onReset,
  onViewSeries,
  previewSeriesPerType,
  previewMinEpisodes,
  previewMaxEpisodes,
}) {
  const checklist = buildGeneratorChecklist({
    previewSeriesPerType,
    previewMinEpisodes,
    previewMaxEpisodes,
  });

  return (
    <AdminPageSection
      title="演示内容生成器"
      description="这里只生成测试目录数据，不作为正式录入入口。"
      action={<AdminBadge tone="accent">仅测试工具</AdminBadge>}
    >
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AdminFormField
              label="种子"
              helperText="可选。需要复现同一批测试数据时再填写。"
            >
              <input
                value={form.seed}
                onChange={(event) => onUpdateField("seed", event.target.value)}
                placeholder="可选的可复现种子"
                className={adminInputClassName}
              />
            </AdminFormField>

            <AdminFormField label="每种类型作品数" helperText="允许范围：1 到 20。">
              <input
                value={form.seriesPerType}
                onChange={(event) => onUpdateField("seriesPerType", event.target.value)}
                inputMode="numeric"
                className={adminInputClassName}
              />
            </AdminFormField>

            <AdminFormField label="最少章节数" helperText="允许范围：1 到 30。">
              <input
                value={form.minEpisodes}
                onChange={(event) => onUpdateField("minEpisodes", event.target.value)}
                inputMode="numeric"
                className={adminInputClassName}
              />
            </AdminFormField>

            <AdminFormField label="最多章节数" helperText="允许范围：1 到 30。">
              <input
                value={form.maxEpisodes}
                onChange={(event) => onUpdateField("maxEpisodes", event.target.value)}
                inputMode="numeric"
                className={adminInputClassName}
              />
            </AdminFormField>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={onGenerate} disabled={generating}>
              {generating ? "生成中..." : "生成内容"}
            </Button>
            <Button type="button" variant="outline" onClick={onReset} disabled={generating}>
              重置设置
            </Button>
            <Button type="button" variant="outline" onClick={onViewSeries}>
              查看作品
            </Button>
          </div>
        </div>

        <div className="rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,247,249,0.92))] p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.02]">
          <h3 className="text-base font-semibold text-slate-950">本次将生成的内容</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            只生成测试用目录，不制造看起来很热闹的假数据。
          </p>

          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="mt-5 rounded-[22px] border border-[color:var(--gush-border)] bg-white px-4 py-4 text-sm leading-6 text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.03)]">
            使用前先确认 <code>ADMIN_CONTENT_GENERATOR_ENABLED=1</code> 已开启。
          </div>
        </div>
      </div>
    </AdminPageSection>
  );
}

export function GeneratorResultSection({ result }) {
  if (!result) {
    return null;
  }

  return (
    <AdminPageSection
      title="最近一次生成"
      description="这里只看最近一次生成结果。"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminMetricCard label="任务编号" value={result.runId || "-"} detail="后端记录这次生成请求的唯一标识。" />
        <AdminMetricCard label="漫画作品" value={String(result.comicsCount ?? 0)} detail="本轮生成出的漫画条目数。" />
        <AdminMetricCard label="小说作品" value={String(result.novelsCount ?? 0)} detail="本轮生成出的小说条目数。" />
        <AdminMetricCard label="总章节数" value={String(result.totalEpisodes ?? 0)} detail="这轮生成覆盖到的章节总量。" />
        <AdminMetricCard label="耗时" value={`${result.duration ?? 0} 秒`} detail="后端返回的执行耗时。" />
        <AdminMetricCard
          label="种子"
          value={String(result.requestPayload?.seed || "随机")}
          detail="需要复现同一批测试数据时，可以再次使用这个种子。"
        />
      </div>
    </AdminPageSection>
  );
}

export function GeneratorFeedback({ feedback, onDismiss }) {
  return <AdminFeedbackBanner feedback={feedback} onDismiss={onDismiss} />;
}
