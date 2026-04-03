"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ShareButton from "../common/ShareButton";
import LoginGateModal from "../layout/LoginGateModal";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";

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

function getCommentAuthor(entry) {
  return entry?.author || entry?.userEmail || "Guest";
}

function getCommentLikeCount(entry) {
  if (typeof entry?.likeCount === "number") {
    return entry.likeCount;
  }
  if (typeof entry?.likes === "number") {
    return entry.likes;
  }
  if (Array.isArray(entry?.likes)) {
    return entry.likes.length;
  }
  return 0;
}

function getCommentLikedByUser(entry) {
  if (typeof entry?.likedByUser === "boolean") {
    return entry.likedByUser;
  }
  if (typeof entry?.liked === "boolean") {
    return entry.liked;
  }
  return false;
}

function buildPromptSuggestions({ seriesTitle, author, status, genres }) {
  const safeTitle = seriesTitle || "this series";
  const leadGenre = Array.isArray(genres) && genres.length > 0 ? genres[0] : "character-driven stories";
  const isCompleted = String(status || "").toLowerCase() === "completed";

  return [
    {
      id: "hook",
      label: "Opening hook",
      text: `The first thing that hooked me in ${safeTitle} was `,
    },
    {
      id: "moment",
      label: isCompleted ? "Ending payoff" : "Latest episode",
      text: isCompleted
        ? `The ending of ${safeTitle} worked for me because `
        : `The latest episode of ${safeTitle} stood out to me because `,
    },
    {
      id: "craft",
      label: author ? `${author} style` : "Art or writing",
      text: author
        ? `The strongest part of ${author}'s work in ${safeTitle} is `
        : `The strongest part of ${safeTitle}'s art or writing is `,
    },
    {
      id: "recommend",
      label: "Recommend?",
      text: `I'd recommend ${safeTitle} to readers who like ${leadGenre} because `,
    },
  ];
}

export default function CommentsSection({
  seriesId,
  seriesTitle = "",
  author = "",
  status = "",
  genres = [],
  isFollowing = false,
  onFollowToggle = null,
  sharePath = "",
}) {
  const { isSignedIn, signIn } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyOpenId, setReplyOpenId] = useState("");
  const [activeModal, setActiveModal] = useState(false);
  const [working, setWorking] = useState(false);
  const [sortKey, setSortKey] = useState("latest");
  const requestRef = useRef(0);
  const inputRef = useRef(null);

  const loadComments = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const response = await apiGet(`/api/comments?seriesId=${seriesId}`);
    if (requestRef.current !== requestId) {
      return;
    }
    if (response.ok) {
      setComments(response.data?.comments || []);
    }
  }, [seriesId]);

  useEffect(() => {
    if (seriesId) {
      setComments([]);
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
        ),
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
        ),
      );
      setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
      setReplyOpenId("");
    }
  };

  const sortedComments = useMemo(() => {
    const list = Array.isArray(comments) ? [...comments] : [];
    if (sortKey === "top") {
      return list.sort(
        (a, b) => getCommentLikeCount(b) - getCommentLikeCount(a),
      );
    }
    return list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
  }, [comments, sortKey]);

  const promptSuggestions = useMemo(
    () => buildPromptSuggestions({ seriesTitle, author, status, genres }),
    [author, genres, seriesTitle, status],
  );

  const shareUrl = useMemo(() => {
    if (sharePath) {
      if (typeof window !== "undefined") {
        return new URL(sharePath, window.location.origin).toString();
      }
      return sharePath;
    }
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "";
  }, [sharePath]);

  const focusComposer = useCallback(
    (seedText = "") => {
      if (!isSignedIn) {
        setActiveModal(true);
        return;
      }

      if (seedText) {
        setInput((prev) => (prev.trim() ? prev : seedText));
      }

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [isSignedIn],
  );

  const secondaryButtonClass =
    "rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]";
  const primaryButtonClass =
    "rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800";
  const inputClass =
    "flex-1 rounded-full border border-black/8 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--gush-accent,#2f6bff)] focus:ring-2 focus:ring-[rgba(47,107,255,0.12)]";

  return (
    <section data-comments-section className="mt-8 rounded-[30px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,240,232,0.94))] p-6 shadow-[0_22px_52px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Reader notes
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">Comments</h3>
          <p className="mt-2 text-sm text-slate-500">
            Share a quick take on the story or latest episode.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onFollowToggle ? (
            <button
              type="button"
              onClick={onFollowToggle}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isFollowing
                  ? "border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.06)] text-slate-950 hover:border-[rgba(47,107,255,0.22)] hover:bg-[rgba(47,107,255,0.09)]"
                  : "border-black/8 bg-white text-slate-700 hover:border-black/12 hover:bg-[#f8f9fc]"
              }`}
            >
              {isFollowing ? "Saved" : "Save"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => focusComposer()}
            className={secondaryButtonClass}
          >
            Write a comment
          </button>
          <ShareButton
            url={shareUrl}
            title={seriesTitle || "Check out this series"}
            description={`Join the conversation around ${seriesTitle || "this series"}.`}
            className={secondaryButtonClass}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortKey("latest")}
            className={`rounded-full border px-3 py-1 transition ${
              sortKey === "latest"
                ? "border-black/10 bg-slate-950 text-white"
                : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[#f8f9fc]"
            }`}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSortKey("top")}
            className={`rounded-full border px-3 py-1 transition ${
              sortKey === "top"
                ? "border-black/10 bg-slate-950 text-white"
                : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[#f8f9fc]"
            }`}
          >
            Top
          </button>
        </div>
        {!isSignedIn ? (
          <button
            type="button"
            onClick={() => setActiveModal(true)}
            className="rounded-full border border-black/8 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-black/12 hover:bg-[#f8f9fc]"
          >
            Sign in to comment
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-[26px] border border-black/6 bg-white/82 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Start the conversation
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep it short. Mention a favorite moment, a recent chapter, or who should read it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {promptSuggestions.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => focusComposer(prompt.text)}
                className="rounded-full border border-black/8 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-black/12 hover:bg-[#f8f9fc]"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Write a comment about ${seriesTitle || "this series"}...`}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={working}
            className={`${primaryButtonClass} min-w-[110px]`}
          >
            Post
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {sortedComments.length === 0 ? (
          <div className="rounded-[24px] border border-black/6 bg-white/84 p-5">
            <p className="text-sm font-semibold text-slate-950">No comments yet.</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">Start the first note.</p>
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-[24px] border border-black/6 bg-white/84 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{getCommentAuthor(comment)}</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{comment.text}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => handleLike(comment.id)}
                  className={`rounded-full border px-3 py-1 transition ${
                    getCommentLikedByUser(comment)
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-black/8 bg-white text-slate-600 hover:border-black/12 hover:bg-[#f8f9fc]"
                  }`}
                >
                  Like {getCommentLikeCount(comment)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setReplyOpenId((prev) => (prev === comment.id ? "" : comment.id))
                  }
                  className="rounded-full border border-black/8 bg-white px-3 py-1 text-slate-600 transition hover:border-black/12 hover:bg-[#f8f9fc]"
                >
                  Reply {Array.isArray(comment.replies) ? comment.replies.length : 0}
                </button>
              </div>
              {Array.isArray(comment.replies) && comment.replies.length > 0 ? (
                <div className="mt-3 space-y-2 rounded-[18px] border border-black/6 bg-[#f8f9fc] p-3 text-xs text-slate-600">
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{getCommentAuthor(reply)}</span>
                        <span>{formatDate(reply.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-700">{reply.text}</p>
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
                    className="flex-1 rounded-full border border-black/8 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-[var(--gush-accent,#2f6bff)] focus:ring-2 focus:ring-[rgba(47,107,255,0.12)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleReply(comment.id)}
                    className="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
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
        description="Sign in to join the comments."
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
