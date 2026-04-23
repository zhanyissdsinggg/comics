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
  const leadGenre =
    Array.isArray(genres) && genres.length > 0
      ? genres[0]
      : "character-driven stories";
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
          comment.id === commentId ? response.data.comment : comment,
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
    "rounded-full border-[3px] border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.06em] text-black transition hover:-translate-y-0.5 hover:bg-[#eefcff]";
  const primaryButtonClass =
    "rounded-full border-[3px] border-black bg-[#ff007a] px-4 py-2 text-sm font-black uppercase tracking-[0.06em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]";
  const inputClass =
    "flex-1 rounded-full border-[3px] border-black bg-white px-4 py-3 text-sm text-black outline-none transition focus:outline-none";

  return (
    <section
      data-comments-section
      className="mt-8 rounded-[30px] border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
            Reader notes
          </p>
          <h3 className="mt-2 text-lg font-black uppercase tracking-[0.04em] text-black">
            Comments
          </h3>
          <p className="mt-2 text-sm text-black/55">
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
                  ? "border-[3px] border-black bg-[#ffe500] text-black"
                  : "border-[3px] border-black bg-white text-black hover:-translate-y-0.5 hover:bg-[#fff7cf]"
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-black/45">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSortKey("latest")}
            className={`rounded-full border px-3 py-1 transition ${
              sortKey === "latest"
                ? "border-[3px] border-black bg-[#ffe500] text-black"
                : "border-[3px] border-black bg-white text-black/65 hover:-translate-y-0.5 hover:bg-[#eefcff]"
            }`}
          >
            Latest
          </button>
          <button
            type="button"
            onClick={() => setSortKey("top")}
            className={`rounded-full border px-3 py-1 transition ${
              sortKey === "top"
                ? "border-[3px] border-black bg-[#ffe500] text-black"
                : "border-[3px] border-black bg-white text-black/65 hover:-translate-y-0.5 hover:bg-[#eefcff]"
            }`}
          >
            Top
          </button>
        </div>
        {!isSignedIn ? (
          <button
            type="button"
            onClick={() => setActiveModal(true)}
            className="rounded-full border-[3px] border-black bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#fff1f7]"
          >
            Sign in to comment
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-[26px] border-[3px] border-black bg-[#fffdf7] p-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
              Start the conversation
            </p>
            <p className="mt-2 text-sm leading-6 text-black/68">
              Keep it short. Mention a favorite moment, a recent chapter, or who
              should read it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {promptSuggestions.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => focusComposer(prompt.text)}
                className="rounded-full border-[3px] border-black bg-white px-3 py-2 text-sm font-bold uppercase tracking-[0.05em] text-black transition hover:bg-[#fff7cf]"
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
          <div className="rounded-[24px] border-[3px] border-black bg-[#fff7cf] p-5">
            <p className="text-sm font-black uppercase tracking-[0.04em] text-black">
              No comments yet.
            </p>
            <p className="mt-2 text-sm leading-6 text-black/55">
              Start the first note.
            </p>
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-[24px] border-[3px] border-black bg-white p-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)]"
            >
              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.08em] text-black/45">
                <span>{getCommentAuthor(comment)}</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm text-black/72">{comment.text}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-black/45">
                <button
                  type="button"
                  onClick={() => handleLike(comment.id)}
                  className={`rounded-full border px-3 py-1 transition ${
                    getCommentLikedByUser(comment)
                      ? "border-[3px] border-black bg-[#ffe500] text-black"
                      : "border-[3px] border-black bg-white text-black/65 hover:bg-[#eefcff]"
                  }`}
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
                  className="rounded-full border-[3px] border-black bg-white px-3 py-1 font-bold uppercase tracking-[0.05em] text-black/65 transition hover:bg-[#fff1f7]"
                >
                  Reply{" "}
                  {Array.isArray(comment.replies) ? comment.replies.length : 0}
                </button>
              </div>
              {Array.isArray(comment.replies) && comment.replies.length > 0 ? (
                <div className="mt-3 space-y-2 rounded-[18px] border-[3px] border-black bg-[#f3f0ea] p-3 text-xs text-black/68">
                  {comment.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.08em] text-black/45">
                        <span>{getCommentAuthor(reply)}</span>
                        <span>{formatDate(reply.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-black/72">
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
                    placeholder="Write a reply..."
                    className="flex-1 rounded-full border-[3px] border-black bg-white px-3 py-2 text-xs text-black outline-none transition focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleReply(comment.id)}
                    className="rounded-full border-[3px] border-black bg-[#ff007a] px-3 py-2 text-xs font-black uppercase tracking-[0.05em] text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#e1006d] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
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
