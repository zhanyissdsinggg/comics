// 鑰佺帇锛氭壒閲忛€夋嫨閫昏緫hook锛岀鐞嗗閫夋鐘舵€?"use client";

import { useState, useCallback } from "react";

export function useSelection(items, idKey = 'id') {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // 鑰佺帇锛氬叏閫?鍙栨秷鍏ㄩ€?
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item[idKey])));
    }
  }, [items, selectedIds.size, idKey]);

  // 鑰佺帇锛氬垏鎹㈠崟涓€夋嫨
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

  // 鑰佺帇锛氭竻绌洪€夋嫨
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // 鑰佺帇锛氭鏌ユ槸鍚﹂€変腑
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