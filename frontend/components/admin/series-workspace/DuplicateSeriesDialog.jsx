"use client";

import { Button } from "@/components/ui/button";

export default function DuplicateSeriesDialog(props) {
  const {
    duplicateDialog,
    setDuplicateDialog,
    handleDuplicate,
    isDuplicating,
  } = props;

  if (!duplicateDialog.isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,27,36,0.28)] p-4 backdrop-blur-sm"
      onClick={() =>
        setDuplicateDialog({ isOpen: false, series: null, newId: "" })
      }
    >
      <div
        className="w-full max-w-lg rounded-[28px] border border-[color:var(--gush-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(247,247,249,0.94))] p-6 shadow-[0_20px_44px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-slate-950">复制作品</h3>
        <p className="mt-1 text-sm text-slate-600">
          基于当前作品生成一份新的草稿副本。
        </p>
        <label className="mt-5 block space-y-2">
          <span className="text-sm font-semibold text-slate-700">
            新的作品编号 *
          </span>
          <input
            value={duplicateDialog.newId}
            onChange={(event) =>
              setDuplicateDialog((current) => ({
                ...current,
                newId: event.target.value,
              }))
            }
            placeholder="请输入新的作品编号"
            className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
          />
        </label>
        <div className="mt-6 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() =>
              setDuplicateDialog({ isOpen: false, series: null, newId: "" })
            }
          >
            取消
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleDuplicate}
            disabled={isDuplicating}
          >
            {isDuplicating ? "复制中..." : "复制作品"}
          </Button>
        </div>
      </div>
    </div>
  );
}
