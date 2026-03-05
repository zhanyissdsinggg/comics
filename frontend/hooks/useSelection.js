// NOTE: cleaned corrupted comment.

import { useState, useCallback } from "react";

export function useSelection(items, idKey = 'id') {
  const [selectedIds, setSelectedIds] = useState(new Set());

  // NOTE: cleaned corrupted comment.
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item[idKey])));
    }
  }, [items, selectedIds.size, idKey]);

  // NOTE: cleaned corrupted comment.
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

  // NOTE: cleaned corrupted comment.
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // NOTE: cleaned corrupted comment.
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