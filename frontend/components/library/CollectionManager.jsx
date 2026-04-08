"use client";

import React, { useCallback, useState } from "react";
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
  const currentCollectionIds = currentCollections.map(
    (collection) => collection.id,
  );

  const handleCreate = useCallback(() => {
    if (!newCollectionName.trim()) {
      setMessage("Please enter a collection name");
      return;
    }

    createCollection(newCollectionName.trim());
    setNewCollectionName("");
    setMessage("Collection created");
    setTimeout(() => setMessage(""), 2000);
  }, [createCollection, newCollectionName]);

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
    [deleteCollection],
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
      if (!seriesId) {
        return;
      }

      if (currentCollectionIds.includes(collectionId)) {
        removeFromCollection(collectionId, seriesId);
        setMessage("Removed from collection");
      } else {
        addToCollection(collectionId, seriesId);
        setMessage("Added to collection");
      }

      setTimeout(() => setMessage(""), 2000);
    },
    [addToCollection, currentCollectionIds, removeFromCollection, seriesId],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-950">Collections</h3>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="rounded-xl border border-[rgba(0,113,227,0.12)] bg-[rgba(0,113,227,0.06)] p-3 text-sm text-slate-700">
          {message}
        </div>
      ) : null}

      <div className="rounded-[24px] border border-black/6 bg-white/86 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <h4 className="text-sm font-semibold text-slate-700">New Collection</h4>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newCollectionName}
            onChange={(event) => setNewCollectionName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleCreate()}
            placeholder="Collection name"
            className="flex-1 rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[rgba(0,113,227,0.24)] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Create
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-700">My Collections</h4>
        {collections.map((collection) => {
          const isDefault = [
            "default",
            "reading",
            "completed",
            "wishlist",
          ].includes(collection.id);
          const isInCollection = currentCollectionIds.includes(collection.id);
          const isEditing = editingId === collection.id;

          return (
            <div
              key={collection.id}
              className="flex items-center gap-3 rounded-[20px] border border-black/6 bg-white/86 p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition-colors hover:border-black/10"
            >
              {seriesId ? (
                <input
                  type="checkbox"
                  checked={isInCollection}
                  onChange={() => handleToggleCollection(collection.id)}
                  className="h-4 w-4 rounded border-black/10 bg-white text-[var(--gush-accent-strong,#0058cc)] focus:ring-[rgba(0,113,227,0.18)]"
                />
              ) : null}

              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) =>
                      event.key === "Enter" && handleSaveEdit()
                    }
                    className="w-full rounded-lg border border-black/8 bg-white px-2 py-1 text-sm text-slate-700 focus:border-[rgba(0,113,227,0.24)] focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {collection.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {collection.seriesIds.length} series
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="rounded-lg bg-slate-950 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded-lg border border-black/8 px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(collection)}
                      className="rounded-lg border border-black/8 px-3 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    {!isDefault ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(collection.id)}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        Delete
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-black/6 bg-white/80 p-3 text-xs text-slate-500">
        Default collections like Favorites, Reading, Completed, and Wishlist can
        be renamed but not deleted.
      </div>
    </div>
  );
});

CollectionManager.displayName = "CollectionManager";

export default CollectionManager;
