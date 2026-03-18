"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ShareButton from "../common/ShareButton";
import LoginGateModal from "../layout/LoginGateModal";
import { apiGet, apiPost } from "../../lib/apiClient";
import { useAuthStore } from "../../store/useAuthStore";
import { useAdultGateStore } from "../../store/useAdultGateStore";

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

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-US");
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
  rating,
  ratingCount,
  onRatingUpdate,
  seriesTitle = "",
  author = "",
  status = "",
  genres = [],
  followers = 0,
  isFollowing = false,
  onFollowToggle = null,
  sharePath = "",
}) {
  const router = useRouter();
  const { isSignedIn, signIn } = useAuthStore();
  const { isAdultMode } = useAdultGateStore();
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyOpenId, setReplyOpenId] = useState("");
  const [activeModal, setActiveModal] = useState(false);
  const [working, setWorking] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [ratingPending, setRatingPending] = useState(false);
  const [sortKey, setSortKey] = useState("latest");
  const requestRef = useRef(0);
  const inputRef = useRef(null);

  const displayRating = useMemo(() => {
    if (!rating || !ratingCount) {
      return null;
    }
    return Number(rating).toFixed(1);
  }, [rating, ratingCount]);

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
    if (ratingPending) {
      return;
    }
    setRatingPending(true);
    const response = await apiPost("/api/ratings", { seriesId, rating: value });
    if (response.ok) {
      setUserRating(value);
      onRatingUpdate?.(response.data.rating, response.data.count);
      void apiGet(`/api/series/${seriesId}?adult=${isAdultMode ? "1" : "0"}`, {
        bust: true,
        dedupeMs: 0,
        suppressAuthModal: true,
      });
    }
    setRatingPending(false);
  };

  const sortedComments = useMemo(() => {
    const list = Array.isArray(comments) ? [...comments] : [];
    if (sortKey === "top") {
      return list.sort(
        (a, b) => getCommentLikeCount(b) - getCommentLikeCount(a)
      );
    }
    return list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [comments, sortKey]);

  const replyCount = useMemo(
    () =>
      comments.reduce(
        (total, comment) => total + (Array.isArray(comment?.replies) ? comment.replies.length : 0),
        0,
      ),
    [comments],
  );

  const topLikeCount = useMemo(
    () => comments.reduce((max, comment) => Math.max(max, getCommentLikeCount(comment)), 0),
    [comments],
  );

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

  const commentStats = useMemo(
    () => [
      {
        label: "Readers talking",
        value: formatCount(comments.length),
        hint: comments.length > 0 ? "Visible comments in the current thread." : "No public comments yet.",
      },
      {
        label: "Replies",
        value: formatCount(replyCount),
        hint: replyCount > 0 ? "Back-and-forth discussion already started." : "No reply chains yet.",
      },
      {
        label: "Top likes",
        value: formatCount(topLikeCount),
        hint: topLikeCount > 0 ? "Most likes on a single comment so far." : "No liked comments yet.",
      },
      {
        label: "Library saves",
        value: formatCount(followers),
        hint: Number(followers || 0) > 0 ? "Readers already keeping up with this title." : "Be the first to save it.",
      },
    ],
    [comments.length, followers, replyCount, topLikeCount],
  );

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
    "flex-1 rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-[var(--gush-accent,#2f6bff)] focus:ring-2 focus:ring-[rgba(47,107,255,0.12)]";

  return (
    <section data-comments-section className="mt-8 rounded-[28px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,248,252,0.98))] p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Ratings & Comments</h3>
          <p className="text-xs text-slate-500">
            {displayRating
              ? `${displayRating} / 5 - ${ratingCount} rating${ratingCount === 1 ? "" : "s"}`
              : "No ratings yet — be the first!"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {STAR_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleRating(value)}
              disabled={ratingPending}
              className={`text-lg ${
                value <= (userRating || rating) ? "text-amber-500" : "text-slate-300"
              }`}
              aria-label={`Rate ${value} star`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {commentStats.map((item) => (
          <div
            key={item.label}
            className="rounded-[22px] border border-black/6 bg-white/84 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-950">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-black/6 bg-white/84 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Community moves
            </p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950">
              Give readers a reason to react, save, and share before they leave the page.
            </h4>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Strong series pages turn comments into a return reason instead of hiding discussion under a plain text box.
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
            <button
              type="button"
              onClick={() => router.push(isFollowing ? "/notifications" : "/library")}
              className={secondaryButtonClass}
            >
              {isFollowing ? "Open notifications" : "Open library"}
            </button>
            <ShareButton
              url={shareUrl}
              title={seriesTitle || "Check out this series"}
              description={`Join the discussion around ${seriesTitle || "this series"}.`}
              className={secondaryButtonClass}
            />
          </div>
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

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Conversation starters
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
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

      <div className="mt-6 flex gap-3">
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
          className={primaryButtonClass}
        >
          Post
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {sortedComments.length === 0 ? (
          <div className="rounded-2xl border border-black/6 bg-white/84 p-4 text-sm text-slate-500">
            Be the first to comment. Strong series pages feel more alive once readers leave a reaction, recommendation, or latest-episode take.
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-black/6 bg-white/84 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
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
                <div className="mt-3 space-y-2 border-l border-black/6 pl-4 text-xs text-slate-600">
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
