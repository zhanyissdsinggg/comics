"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LoginGateModal from "../layout/LoginGateModal";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";

const STAR_VALUES = [1, 2, 3, 4, 5];

function formatDate(value) {
  if (!value) {
    return "";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(new Date(parsed));
}

export default function CommentsSection({ seriesId, rating, ratingCount, onRatingUpdate }) {
  const { isSignedIn, signIn } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyOpenId, setReplyOpenId] = useState("");
  const [activeModal, setActiveModal] = useState(false);
  const [working, setWorking] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [sortKey, setSortKey] = useState("latest");

  const displayRating = useMemo(() => {
    if (!rating) {
      return "0.0";
    }
    return Number(rating).toFixed(1);
  }, [rating]);

  const loadComments = useCallback(async () => {
    const response = await apiGet(`/api/comments?seriesId=${seriesId}`);
    if (response.ok) {
      setComments(response.data?.comments || []);
    }
  }, [seriesId]);

  useEffect(() => {
    if (seriesId) {
      loadComments();
    }
  }, [seriesId, loadComments]);

  const handleSubmit = async () => {
    if (!isSignedIn) {
      setActiveModal(true);
      return;
    }
    if (!input.trim()) {
      return;
    }
    setWorking(true);
    const response = await apiPost("/api/comments", {
      seriesId,
      text: input.trim(),
    });
    if (response.ok) {
      setComments((prev) => [response.data.comment, ...prev]);
      setInput("");
    }
    setWorking(false);
  };

  const handleLike = async (commentId) => {
    if (!isSignedIn) {
      setActiveModal(true);
      return;
    }
    const response = await apiPost("/api/comments", {
      seriesId,
      action: "LIKE",
      commentId,
    });
    if (response.ok) {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? response.data.comment : comment
        )
      );
    }
  };

  const handleReply = async (commentId) => {
    if (!isSignedIn) {
      setActiveModal(true);
      return;
    }
    const text = replyDrafts[commentId] || "";
    if (!text.trim()) {
      return;
    }
    const response = await apiPost("/api/comments", {
      seriesId,
      action: "REPLY",
      commentId,
      text: text.trim(),
    });
    if (response.ok) {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? response.data.comment : comment
        )
      );
      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
      setReplyOpenId("");
    }
  };

  const handleRating = async (value) => {
    if (!isSignedIn) {
      setActiveModal(true);
      return;
    }
    setUserRating(value);
    const response = await apiPost("/api/ratings", { seriesId, rating: value });
    if (response.ok) {
      onRatingUpdate?.(response.data.rating, response.data.count);
    }
  };

  const sortedComments = useMemo(() => {
    const list = Array.isArray(comments) ? [...comments] : [];
    if (sortKey === "top") {
      return list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }
    return list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [comments, sortKey]);

  return (
    <section className="mt-10 rounded-3xl border border-neutral-900 bg-neutral-900/40 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Ratings & Comments</h3>
          <p className="text-xs text-neutral-400">
            {displayRating} / 5 - {ratingCount || 0} ratings
          </p>
        </div>
        <div className="flex items-center gap-1">
          {STAR_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleRating(value)}
              className={`text-lg ${
                value <= (userRating || rating) ? "text-yellow-400" : "text-neutral-600"
              }`}
              aria-label={`Rate ${value} star`}
            >
              *
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortKey("latest")}
            className={`rounded-full border px-3 py-1 ${
              sortKey === "latest" ? "border-neutral-600 text-neutral-200" : "border-neutral-800"
            }`}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSortKey("top")}
            className={`rounded-full border px-3 py-1 ${
              sortKey === "top" ? "border-neutral-600 text-neutral-200" : "border-neutral-800"
            }`}
          >
            Top
          </button>
        </div>
        {!isSignedIn ? (
          <button
            type="button"
            onClick={() => setActiveModal(true)}
            className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-200"
          >
            Sign in to comment
          </button>
        ) : null}
      </div>

      <div className="mt-6 flex gap-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={working}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-900"
        >
          Post
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {sortedComments.length === 0 ? (
          <div className="rounded-2xl border border-neutral-900 bg-neutral-950/50 p-4 text-sm text-neutral-500">
            Be the first to comment.
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4"
            >
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{comment.author}</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-200">{comment.text}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => handleLike(comment.id)}
                  className={`rounded-full border px-3 py-1 ${
                    comment.likedByUser
                      ? "border-yellow-500 text-yellow-300"
                      : "border-neutral-800"
                  }`}
                >
                  Like {comment.likeCount || 0}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setReplyOpenId((prev) => (prev === comment.id ? "" : comment.id))
                  }
                  className="rounded-full border border-neutral-800 px-3 py-1"
                >
                  Reply {Array.isArray(comment.replies) ? comment.replies.length : 0}
                </button>
              </div>
              {Array.isArray(comment.replies) && comment.replies.length > 0 ? (
                <div className="mt-3 space-y-2 border-l border-neutral-800 pl-4 text-xs text-neutral-300">
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500">
                        <span>{reply.author}</span>
                        <span>{formatDate(reply.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-200">{reply.text}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              {replyOpenId === comment.id ? (
                <div className="mt-3 flex gap-2">
                  <input
                    value={replyDrafts[comment.id] || ""}
                    onChange={(event) =>
                      setReplyDrafts((prev) => ({
                        ...prev,
                        [comment.id]: event.target.value,
                      }))
                    }
                    placeholder="Write a reply..."
                    className="flex-1 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleReply(comment.id)}
                    className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-neutral-900"
                  >
                    Reply
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <LoginGateModal
        open={activeModal}
        onClose={() => setActiveModal(false)}
        allowRegister
        title="Sign in"
        description="Sign in to post comments or rate."
        onSubmit={async ({ email, password, mode }) => {
          const response = await signIn(email, password, mode);
          if (response?.status === 202) {
            return response;
          }
          if (response.ok) {
            setActiveModal(false);
            loadComments();
          }
          return response;
        }}
      />
    </section>
  );
}
