"use client";

import React, { useState, useCallback } from "react";
import { useFollowStore } from "../../store/useFollowStore";

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

  const currentCollections = seriesId ? getCollectionsForSeries(seriesId) : [];
  const currentCollectionIds = currentCollections.map((c) => c.id);

  const handleCreate = useCallback(() => {
    if (!newCollectionName.trim()) {
      setMessage("Please enter a collection name");
      return;
    }
    createCollection(newCollectionName.trim());
    setNewCollectionName("");
    setMessage("Collection created");
    setTimeout(() => setMessage(""), 2000);
  }, [newCollectionName, createCollection]);

  const handleDelete = useCallback(
    (collectionId) => {
      const result = deleteCollection(collectionId);
      if (result.ok) {
        setMessage("Collection deleted");
      } else {
        setMessage(result.error || "Delete failed");
      }
      setTimeout(() => setMessage(""), 2000);
    },
    [deleteCollection]
  );

  const handleStartEdit = useCallback((collection) => {
    setEditingId(collection.id);
    setEditingName(collection.name);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingName.trim()) {
      setMessage("Please enter a collection name");
      return;
    }
    renameCollection(editingId, editingName.trim());
    setEditingId(null);
    setEditingName("");
    setMessage("Collection renamed");
    setTimeout(() => setMessage(""), 2000);
  }, [editingId, editingName, renameCollection]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingName("");
  }, []);

  const handleToggleCollection = useCallback(
    (collectionId) => {
      if (!seriesId) return;

      if (currentCollectionIds.includes(collectionId)) {
        removeFromCollection(collectionId, seriesId);
        setMessage("Removed from collection");
      } else {
        addToCollection(collectionId, seriesId);
        setMessage("Added to collection");
      }
      setTimeout(() => setMessage(""), 2000);
    },
    [seriesId, currentCollectionIds, addToCollection, removeFromCollection]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Collections</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
        <h4 className="text-sm font-semibold text-neutral-300">New Collection</h4>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Collection name"
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleCreate}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
          >
            Create
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-neutral-300">My Collections</h4>
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
              {seriesId && (
                <input
                  type="checkbox"
                  checked={isInCollection}
                  onChange={() => handleToggleCollection(collection.id)}
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-emerald-500"
                />
              )}

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
                      {collection.seriesIds.length} series
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="rounded-lg border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartEdit(collection)}
                      className="rounded-lg border border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-800"
                    >
                      Edit
                    </button>
                    {!isDefault && (
                      <button
                        onClick={() => handleDelete(collection.id)}
                        className="rounded-lg border border-red-500/20 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-400">
        💡 Default collections (Favorites, Reading, Completed, Wishlist) cannot be deleted but can be renamed.
      </div>
    </div>
  );
});

CollectionManager.displayName = "CollectionManager";

export default CollectionManager;

