"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ShareButton from "../common/ShareButton";
import LoginGateModal from "../layout/LoginGateModal";
import { apiGet, apiPost } from "../../lib/apiClient";
import { emitAuthRequired } from "../../lib/authBus";
import { useAuthStore } from "../../store/useAuthStore";
import { getInstallmentLabel } from "../../lib/seriesFormatLabels";
import {
  storefrontAccentChipClass,
  storefrontBadgeClass,
  storefrontChipClass,
  storefrontInfoCardClass,
  storefrontPrimaryButtonClass,
  storefrontSecondaryButtonClass,
  storefrontInputClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";

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
  return entry?.author || entry?.userEmail || "Reader";
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

function buildPromptSuggestions({
  seriesTitle,
  author,
  status,
  genres,
  seriesType,
}) {
  const safeTitle = seriesTitle || "this series";
  const leadGenre =
    Array.isArray(genres) && genres.length > 0
      ? genres[0]
      : "character-driven stories";
  const isCompleted = String(status || "").toLowerCase() === "completed";
  const latestInstallmentLabel = getInstallmentLabel(seriesType).toLowerCase();

  return [
    {
      id: "hook",
      label: "Opening hook",
      text: `The first thing that hooked me in ${safeTitle} was `,
    },
    {
      id: "moment",
      label: isCompleted ? "Ending payoff" : `Latest ${latestInstallmentLabel}`,
      text: isCompleted
        ? `The ending of ${safeTitle} worked for me because `
        : `The latest ${latestInstallmentLabel} of ${safeTitle} stood out to me because `,
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
  seriesType = "",
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
      emitAuthRequired({ source: "comment" });
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
      emitAuthRequired({ source: "comment_like" });
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
          comment.id === commentId ? response.data.comment : comment,
        ),
      );
    }
  };

  const handleReply = async (commentId) => {
    if (!isSignedIn) {
      emitAuthRequired({ source: "comment_reply" });
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
          comment.id === commentId ? response.data.comment : comment,
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
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  }, [comments, sortKey]);

  const promptSuggestions = useMemo(
    () =>
      buildPromptSuggestions({
        seriesTitle,
        author,
        status,
        genres,
        seriesType,
      }),
    [author, genres, seriesTitle, seriesType, status],
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
        emitAuthRequired({ source: "comment_focus" });
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

  const secondaryButtonClass = storefrontSecondaryButtonClass;
  const primaryButtonClass = storefrontPrimaryButtonClass;
  const inputClass = `${storefrontInputClass} mt-0 flex-1 rounded-full px-4 py-3`;
  const chipButtonClass = (active) =>
    active
      ? `${storefrontAccentChipClass} min-h-[34px] px-3 py-1 text-xs`
      : `${storefrontChipClass} min-h-[34px] px-3 py-1 text-xs`;
  const smallActionClass =
    "min-h-[34px] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]";
  const subtleActionClass = `${storefrontChipClass} ${smallActionClass}`;
  const emphasizedActionClass = `${storefrontAccentChipClass} ${smallActionClass}`;

  return (
    <section
      data-comments-section
      className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,18,33,0.94)_0%,rgba(15,13,24,0.98)_100%)] p-6 text-white shadow-[0_28px_72px_rgba(8,6,20,0.34)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
            Community
          </p>
          <h3 className="mt-2 font-display text-[1.6rem] font-semibold tracking-[-0.04em] text-white">
            Comments
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Start the discussion",
              "Be first to call the twist",
              "Tell readers what you noticed",
            ].map((item) => (
              <span
                key={item}
                className={`${storefrontBadgeClass} px-3 py-1.5 text-[11px] normal-case tracking-[0.01em] text-white/74`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onFollowToggle ? (
            <button
              type="button"
              onClick={onFollowToggle}
              className={isFollowing ? emphasizedActionClass : subtleActionClass}
            >
              {isFollowing ? "Saved" : "Save Series"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => focusComposer()}
            className={secondaryButtonClass}
          >
            Comment
          </button>
          <ShareButton
            url={shareUrl}
            title={seriesTitle || "Check out this series"}
            description=""
            className={secondaryButtonClass}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortKey("latest")}
            className={chipButtonClass(sortKey === "latest")}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSortKey("top")}
            className={chipButtonClass(sortKey === "top")}
          >
            Top
          </button>
        </div>
        {!isSignedIn ? (
          <button
            type="button"
            onClick={() => setActiveModal(true)}
            className={`px-3 py-1 text-xs ${storefrontSecondaryButtonClass}`}
          >
            Sign in
          </button>
        ) : null}
      </div>

      <div className={`mt-5 ${storefrontInfoCardClass} p-4`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58">
              Comments
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {promptSuggestions.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => focusComposer(prompt.text)}
                className={`${storefrontChipClass} px-3 py-2 text-sm tracking-[0.01em] text-white/80`}
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
            placeholder={`Comment on ${seriesTitle || "this series"}...`}
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
          <div className={`${storefrontInfoCardClass} p-5 text-white`}>
            <p className="text-sm font-semibold tracking-[-0.02em] text-white">
              No comments yet.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
              Say what you think before everyone else catches up.
            </p>
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              className={`${storefrontInfoCardClass} p-4 text-white`}
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-white/60">
                <span>{getCommentAuthor(comment)}</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-white/80">
                {comment.text}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                <button
                  type="button"
                  onClick={() => handleLike(comment.id)}
                  className={
                    getCommentLikedByUser(comment)
                      ? emphasizedActionClass
                      : subtleActionClass
                  }
                >
                  Like {getCommentLikeCount(comment)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setReplyOpenId((prev) =>
                      prev === comment.id ? "" : comment.id,
                    )
                  }
                  className={subtleActionClass}
                >
                  Reply{" "}
                  {Array.isArray(comment.replies) ? comment.replies.length : 0}
                </button>
              </div>
              {Array.isArray(comment.replies) && comment.replies.length > 0 ? (
                <div className={`mt-3 space-y-2 ${storefrontSoftCardClass} p-3 text-xs text-white/75`}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-white/60">
                        <span>{getCommentAuthor(reply)}</span>
                        <span>{formatDate(reply.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-white/80">
                        {reply.text}
                      </p>
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
                    placeholder="Add a reply..."
                    className={`${storefrontInputClass} mt-0 flex-1 rounded-full px-3 py-2 text-xs font-semibold`}
                  />
                  <button
                    type="button"
                    onClick={() => handleReply(comment.id)}
                    className={`px-3 py-2 text-xs ${storefrontPrimaryButtonClass}`}
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
        description=""
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
