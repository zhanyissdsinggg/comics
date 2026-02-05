"use client";

import React, { useState, useCallback } from "react";
import { useFollowStore } from "../../store/useFollowStore";

/**
 * 老王注释：收藏夹管理组件
 * 功能：创建、编辑、删除收藏夹，管理作品分类
 * 遵循KISS原则：简洁的列表和表单设计
 * 遵循DRY原则：复用useFollowStore逻辑
 */
const CollectionManager = React.memo(({ seriesId, onClose }) => {
  const {
    collections,
    createCollection,
    deleteCollection,
    renameCollection,
    addToCollection,
    removeFromCollection,
    getCollectionsForSeries,
  } = useFollowStore();

  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [message, setMessage] = useState("");

  // 老王注释：获取当前作品所在的收藏夹
  const currentCollections = seriesId ? getCollectionsForSeries(seriesId) : [];
  const currentCollectionIds = currentCollections.map((c) => c.id);

  // 老王注释：创建新收藏夹
  const handleCreate = useCallback(() => {
    if (!newCollectionName.trim()) {
      setMessage("请输入收藏夹名称");
      return;
    }
    createCollection(newCollectionName.trim());
    setNewCollectionName("");
    setMessage("收藏夹创建成功");
    setTimeout(() => setMessage(""), 2000);
  }, [newCollectionName, createCollection]);

  // 老王注释：删除收藏夹
  const handleDelete = useCallback(
    (collectionId) => {
      const result = deleteCollection(collectionId);
      if (result.ok) {
        setMessage("收藏夹已删除");
      } else {
        setMessage(result.error || "删除失败");
      }
      setTimeout(() => setMessage(""), 2000);
    },
    [deleteCollection]
  );

  // 老王注释：开始编辑收藏夹名称
  const handleStartEdit = useCallback((collection) => {
    setEditingId(collection.id);
    setEditingName(collection.name);
  }, []);

  // 老王注释：保存编辑
  const handleSaveEdit = useCallback(() => {
    if (!editingName.trim()) {
      setMessage("请输入收藏夹名称");
      return;
    }
    renameCollection(editingId, editingName.trim());
    setEditingId(null);
    setEditingName("");
    setMessage("收藏夹已重命名");
    setTimeout(() => setMessage(""), 2000);
  }, [editingId, editingName, renameCollection]);

  // 老王注释：取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName("");
  }, []);

  // 老王注释：切换作品在收藏夹中的状态
  const handleToggleCollection = useCallback(
    (collectionId) => {
      if (!seriesId) return;

      if (currentCollectionIds.includes(collectionId)) {
        removeFromCollection(collectionId, seriesId);
        setMessage("已从收藏夹移除");
      } else {
        addToCollection(collectionId, seriesId);
        setMessage("已添加到收藏夹");
      }
      setTimeout(() => setMessage(""), 2000);
    },
    [seriesId, currentCollectionIds, addToCollection, removeFromCollection]
  );

  return (
    <div className="space-y-4">
      {/* 老王注释：标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">收藏夹管理</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label="关闭"
          >
            ✕
          </button>
        )}
      </div>

      {/* 老王注释：消息提示 */}
      {message && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          {message}
        </div>
      )}

      {/* 老王注释：创建新收藏夹 */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
        <h4 className="text-sm font-semibold text-neutral-300">创建新收藏夹</h4>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCreate()}
            placeholder="输入收藏夹名称"
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            创建
          </button>
        </div>
      </div>

      {/* 老王注释：收藏夹列表 */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-neutral-300">我的收藏夹</h4>
        {collections.map((collection) => {
          const isDefault = ["default", "reading", "completed", "wishlist"].includes(
            collection.id
          );
          const isInCollection = currentCollectionIds.includes(collection.id);
          const isEditing = editingId === collection.id;

          return (
            <div
              key={collection.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 transition-colors hover:border-neutral-700"
            >
              {/* 老王注释：选择框（仅在有seriesId时显示） */}
              {seriesId && (
                <input
                  type="checkbox"
                  checked={isInCollection}
                  onChange={() => handleToggleCollection(collection.id)}
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-emerald-500"
                />
              )}

              {/* 老王注释：收藏夹名称或编辑框 */}
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSaveEdit()}
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <div>
                    <div className="text-sm font-medium text-neutral-200">
                      {collection.name}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {collection.seriesIds.length} 部作品
                    </div>
                  </div>
                )}
              </div>

              {/* 老王注释：操作按钮 */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="rounded-lg border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartEdit(collection)}
                      className="rounded-lg border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800"
                    >
                      编辑
                    </button>
                    {!isDefault && (
                      <button
                        onClick={() => handleDelete(collection.id)}
                        className="rounded-lg border border-red-500/20 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        删除
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 老王注释：提示信息 */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-400">
        💡 提示：默认收藏夹（默认收藏夹、正在阅读、已完成、想看）不能删除，但可以重命名。
      </div>
    </div>
  );
});

CollectionManager.displayName = "CollectionManager";

export default CollectionManager;
