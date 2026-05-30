"use client";

import React, { useCallback, useState } from "react";
import { useFollowStore } from "../../store/useFollowStore";
import {
  storefrontInputClass,
  storefrontInsetCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";

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
      setMessage("Enter a collection name.");
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
      setMessage("Enter a collection name.");
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
    <div className="space-y-4 text-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black uppercase tracking-[-0.03em] text-white">
          Collections
        </h3>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className={`${storefrontSecondaryButtonClass} px-3 py-2 text-xs tracking-[0.08em]`}
            aria-label="Close"
          >
            <span aria-hidden="true">Close</span>
          </button>
        ) : null}
      </div>

      {message ? (
        <div className={`${storefrontSoftCardClass} text-sm font-medium text-white`}>
          {message}
        </div>
      ) : null}

      <div className={`${storefrontInsetCardClass} p-4`}>
        <h4 className="text-sm font-black uppercase tracking-[0.08em] text-white/80">
          New Collection
        </h4>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newCollectionName}
            onChange={(event) => setNewCollectionName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleCreate()}
            placeholder="Collection name"
            className={`flex-1 ${storefrontInputClass} mt-0 rounded-full px-3 py-2`}
          />
          <button
            type="button"
            onClick={handleCreate}
            className={`${storefrontPrimaryButtonClass} h-10 px-4 text-[11px] tracking-[0.08em]`}
          >
            Create
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-black uppercase tracking-[0.08em] text-white/80">
          My Collections
        </h4>
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
              className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-[rgba(255,255,255,0.045)] p-3 shadow-[0_18px_38px_rgba(8,6,20,0.22)] backdrop-blur-xl transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-white/16"
            >
              {seriesId ? (
                <input
                  type="checkbox"
                  checked={isInCollection}
                  onChange={() => handleToggleCollection(collection.id)}
                  className="h-4 w-4 rounded border border-white/20 bg-[rgba(7,10,21,0.72)] text-cyan-300"
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
                    className={`w-full ${storefrontInputClass} mt-0 rounded-full px-3 py-2`}
                    autoFocus
                  />
                ) : (
                  <div>
                    <div className="text-sm font-black uppercase tracking-[-0.01em] text-white">
                      {collection.name}
                    </div>
                    <div className="text-xs font-semibold text-white/70">
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
                      className={`${storefrontPrimaryButtonClass} h-9 px-3 text-[11px] tracking-[0.08em]`}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className={`${storefrontSecondaryButtonClass} h-9 px-3 text-[11px] tracking-[0.08em]`}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(collection)}
                      className={`${storefrontSecondaryButtonClass} h-9 px-3 text-[11px] tracking-[0.08em]`}
                    >
                      Edit
                    </button>
                    {!isDefault ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(collection.id)}
                        className="h-9 rounded-full border border-[rgba(255,79,154,0.28)] bg-[linear-gradient(135deg,rgba(255,79,154,0.22)_0%,rgba(255,124,177,0.16)_100%)] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-[0_14px_28px_rgba(255,79,154,0.18)] transition-transform duration-150 ease-out hover:-translate-y-0.5"
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

      <div className={`${storefrontSoftCardClass} text-xs font-medium text-white/70`}>
        Default collections like Favorites, Reading, Completed, and Wishlist can
        be renamed but not deleted.
      </div>
    </div>
  );
});

CollectionManager.displayName = "CollectionManager";

export default CollectionManager;
