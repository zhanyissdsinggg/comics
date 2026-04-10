"use client";

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
      onClick={() => setDuplicateDialog({ isOpen: false, series: null, newId: "" })}
    >
      <div
        className="w-full max-w-lg rounded-[28px] border border-[color:var(--gush-border)] bg-white/96 p-6 shadow-[var(--gush-shadow-panel)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-slate-950">复制作品</h3>
        <p className="mt-1 text-sm text-slate-600">基于当前作品生成一个新的草稿副本。</p>
        <label className="mt-5 block space-y-2">
          <span className="text-sm font-semibold text-slate-700">新的作品 ID *</span>
          <input
            value={duplicateDialog.newId}
            onChange={(event) =>
              setDuplicateDialog((current) => ({ ...current, newId: event.target.value }))
            }
            placeholder="请输入新的作品 ID"
            className="w-full rounded-[20px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[color:var(--gush-border-strong)]"
          />
        </label>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setDuplicateDialog({ isOpen: false, series: null, newId: "" })}
            className="flex-1 rounded-full border border-[color:var(--gush-border)] bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            disabled={isDuplicating}
            className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDuplicating ? "复制中..." : "复制"}
          </button>
        </div>
      </div>
    </div>
  );
}
