"use client";

import { useState } from "react";

/**
 * 老王注释：批量操作工具栏组件 - 支持批量删除、批量更新等操作
 * 这个SB组件让用户能快速对多条数据进行操作，提高效率
 */
export function BulkActions({
  selectedIds = [],
  onDelete = null,
  onUpdate = null,
  onExport = null,
  onImport = null,
  loading = false,
  actions = [],
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  if (selectedIds.length === 0) {
    return null;
  }

  // 老王说：处理删除确认
  const handleDeleteClick = () => {
    setConfirmAction("delete");
    setShowConfirm(true);
  };

  // 老王说：确认删除
  const confirmDelete = async () => {
    setShowConfirm(false);
    if (onDelete) {
      await onDelete(selectedIds);
    }
  };

  // 老王说：处理自定义操作
  const handleCustomAction = async (action) => {
    if (action.handler) {
      await action.handler(selectedIds);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4">
      {/* 老王说：选中数量提示 */}
      <div className="flex-1">
        <span className="text-sm text-emerald-400">
          已选中 {selectedIds.length} 项
        </span>
      </div>

      {/* 老王说：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 导出按钮 */}
        {onExport && (
          <button
            onClick={() => onExport(selectedIds)}
            disabled={loading}
            className="px-3 py-1 rounded text-sm border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            📥 导出
          </button>
        )}

        {/* 导入按钮 */}
        {onImport && (
          <button
            onClick={() => onImport(selectedIds)}
            disabled={loading}
            className="px-3 py-1 rounded text-sm border border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            📤 导入
          </button>
        )}

        {/* 自定义操作按钮 */}
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleCustomAction(action)}
            disabled={loading}
            className={`px-3 py-1 rounded text-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${action.className || "border-neutral-500/20 bg-neutral-500/10 text-neutral-400 hover:bg-neutral-500/20"}`}
          >
            {action.icon} {action.label}
          </button>
        ))}

        {/* 更新按钮 */}
        {onUpdate && (
          <button
            onClick={() => onUpdate(selectedIds)}
            disabled={loading}
            className="px-3 py-1 rounded text-sm border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ✏️ 编辑
          </button>
        )}

        {/* 删除按钮 */}
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={loading}
            className="px-3 py-1 rounded text-sm border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🗑️ 删除
          </button>
        )}
      </div>

      {/* 老王说：删除确认对话框 */}
      {showConfirm && confirmAction === "delete" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-white/10 rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-white mb-4">
              确认删除？
            </h3>
            <p className="text-neutral-400 mb-6">
              你确定要删除这 {selectedIds.length} 项吗？此操作无法撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded border border-white/10 text-neutral-300 hover:bg-white/5 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                disabled={loading}
                className="px-4 py-2 rounded bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
