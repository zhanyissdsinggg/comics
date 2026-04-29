"use client";

import React, { useCallback, useState } from "react";
import { useFollowStore } from "../../store/useFollowStore";
import {
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
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
            className="rounded-full border-2 border-black bg-[#FFE500] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5"
            aria-label="Close"
          >
            <span aria-hidden="true">Close</span>
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="rounded-[22px] border-2 border-black bg-[#0b0b0b] p-3 text-sm font-semibold text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          {message}
        </div>
      ) : null}

      <div className="rounded-[24px] border-2 border-black bg-[#0b0b0b] p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
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
            className="flex-1 rounded-full border-2 border-white/20 bg-black px-3 py-2 text-sm font-semibold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] placeholder:text-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE500]"
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
              className="flex items-center gap-3 rounded-[20px] border-2 border-black bg-[#0b0b0b] p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5"
            >
              {seriesId ? (
                <input
                  type="checkbox"
                  checked={isInCollection}
                  onChange={() => handleToggleCollection(collection.id)}
                  className="h-4 w-4 rounded border-2 border-white/20 bg-black text-[#FFE500]"
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
                    className="w-full rounded-full border-2 border-white/20 bg-black px-3 py-2 text-sm font-semibold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE500]"
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
                        className="h-9 rounded-full border-2 border-black bg-[#FF007A] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform duration-150 ease-out hover:translate-x-0.5 hover:translate-y-0.5"
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

      <div className="rounded-[22px] border-2 border-black bg-black p-3 text-xs font-semibold text-white/70 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        Default collections like Favorites, Reading, Completed, and Wishlist can
        be renamed but not deleted.
      </div>
    </div>
  );
});

CollectionManager.displayName = "CollectionManager";

export default CollectionManager;
