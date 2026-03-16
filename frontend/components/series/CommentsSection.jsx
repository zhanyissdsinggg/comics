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
        hint: Number(followers || 0) > 0 ? "Readers who already saved this title." : "First saves are still up for grabs.",
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

  return (
    <section data-comments-section className="mt-8 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Ratings & Comments</h3>
          <p className="text-xs text-neutral-400">
            {displayRating
              ? `${displayRating} / 5 — ${ratingCount} rating${ratingCount === 1 ? "" : "s"}`
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
                value <= (userRating || rating) ? "text-yellow-400" : "text-neutral-600"
              }`}
              aria-label={`Rate ${value} star`}
            >
              *
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {commentStats.map((item) => (
          <div
            key={item.label}
            className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
              {item.label}
            </p>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
              {item.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-400">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300/85">
              Community moves
            </p>
            <h4 className="mt-2 text-lg font-semibold text-white">
              Give readers a reason to react, save, and share before they leave the page.
            </h4>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
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
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:border-emerald-300/50 hover:bg-emerald-400/15"
                    : "border-white/10 bg-white/[0.04] text-neutral-100 hover:border-white/20 hover:bg-white/[0.08]"
                }`}
              >
                {isFollowing ? "Saved to library" : "Save to library"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => focusComposer()}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Write a comment
            </button>
            <button
              type="button"
              onClick={() => router.push(isFollowing ? "/notifications" : "/library")}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              {isFollowing ? "Open notifications" : "Open library"}
            </button>
            <ShareButton
              url={shareUrl}
              title={seriesTitle || "Check out this series"}
              description={`Join the discussion around ${seriesTitle || "this series"}.`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:border-white/20 hover:bg-white/[0.08]"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortKey("latest")}
            className={`rounded-full border px-3 py-1 ${
              sortKey === "latest" ? "border-neutral-600 text-neutral-200" : "border-white/10"
            }`}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSortKey("top")}
            className={`rounded-full border px-3 py-1 ${
              sortKey === "top" ? "border-neutral-600 text-neutral-200" : "border-white/10"
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

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
          Conversation starters
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {promptSuggestions.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => focusComposer(prompt.text)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.08]"
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
          className="flex-1 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm"
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
          <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-neutral-500">
            Be the first to comment. Strong series pages feel more alive once readers leave a reaction, recommendation, or latest-episode take.
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-white/10 bg-black/60 p-4"
            >
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{getCommentAuthor(comment)}</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-200">{comment.text}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => handleLike(comment.id)}
                  className={`rounded-full border px-3 py-1 ${
                    getCommentLikedByUser(comment)
                      ? "border-yellow-500 text-yellow-300"
                      : "border-white/10"
                  }`}
                >
                  Like {getCommentLikeCount(comment)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setReplyOpenId((prev) => (prev === comment.id ? "" : comment.id))
                  }
                  className="rounded-full border border-white/10 px-3 py-1"
                >
                  Reply {Array.isArray(comment.replies) ? comment.replies.length : 0}
                </button>
              </div>
              {Array.isArray(comment.replies) && comment.replies.length > 0 ? (
                <div className="mt-3 space-y-2 border-l border-white/10 pl-4 text-xs text-neutral-300">
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500">
                        <span>{getCommentAuthor(reply)}</span>
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
                    className="flex-1 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs"
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
