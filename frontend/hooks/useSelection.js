// 老王：批量选择逻辑hook，管理复选框状态
"use client";

import { useState, useCallback } from "react";

export function useSelection(items, idKey = 'id') {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // 老王：全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item[idKey])));
    }
  }, [items, selectedIds.size, idKey]);

  // 老王：切换单个选择
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  // 老王：清空选择
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 老王：检查是否选中
  const isSelected = useCallback((id) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;

  return {
    selectedIds,
    toggleSelectAll,
    toggleSelect,
    clearSelection,
    isSelected,
    isAllSelected,
  };
}
