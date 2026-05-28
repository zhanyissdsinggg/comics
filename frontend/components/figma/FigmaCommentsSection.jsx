"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Crown,
  EyeOff,
  Heart,
  MessageSquare,
  Pin,
  Send,
} from "lucide-react";
import {
  getFallbackImageUrl,
  resolveDisplayImageUrl,
} from "../../lib/fallbackImage";
import { openAuthPrompt } from "../../lib/openAuthPrompt";
import { cn } from "./figma-utils";
import { useFigmaSite } from "./FigmaSiteContext";
import { useAuthStore } from "../../store/useAuthStore";

function CommentItem({ comment, onRequireAuth }) {
  const { palette, isAdultMode } = useFigmaSite();
  const [liked, setLiked] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(!comment.isSpoiler);

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-all md:p-5",
        palette.surface,
        comment.isPinned
          ? isAdultMode
            ? "border-red-500/30 bg-red-500/5"
            : "border-indigo-500/30 bg-indigo-500/5"
          : "border-white/5",
      )}
    >
      {comment.isPinned ? (
        <div
          className={cn(
            "mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.22em]",
            palette.primaryText,
          )}
        >
          <Pin className="h-3.5 w-3.5" />
          Pinned Top Comment
        </div>
      ) : null}

      <div className="flex gap-3 md:gap-4">
        <div className="relative shrink-0">
          <img
            src={resolveDisplayImageUrl(comment.avatar, {
              kind: "avatar",
              variant: "indigo",
            })}
            alt={comment.user}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 md:h-12 md:w-12"
          />
          {comment.vipLevel > 0 ? (
            <div className="absolute -bottom-2 -right-2 flex items-center rounded-full border-2 border-[#121212] bg-yellow-500 px-1.5 py-0.5 text-[9px] font-black text-black">
              <Crown className="mr-0.5 h-2.5 w-2.5" />V{comment.vipLevel}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="truncate pr-2 text-sm font-bold text-white md:text-base">
              {comment.user}
            </span>
            <span className="whitespace-nowrap text-xs text-gray-500">
              {comment.date}
            </span>
          </div>

          <div className="relative mb-3 mt-2">
            {comment.isSpoiler && !showSpoiler ? (
              <button
                type="button"
                onClick={() => setShowSpoiler(true)}
                className="relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-red-500/30 bg-red-500/5 p-4 text-left transition-all active:scale-[0.98]"
              >
                <div className="absolute inset-0 z-10 backdrop-blur-md" />
                <div className="relative z-20 flex flex-col items-center gap-1">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-white">
                    Tap to reveal spoiler
                  </span>
                </div>
                <p className="line-clamp-2 select-none text-sm opacity-20 blur-sm">
                  {comment.text}
                </p>
              </button>
            ) : (
              <div className="group relative">
                <p
                  className={cn(
                    "text-sm leading-relaxed text-gray-300 md:text-base",
                    comment.isSpoiler ? "border-l-2 border-red-500 pl-3" : "",
                  )}
                >
                  {comment.text}
                </p>
                {comment.isSpoiler ? (
                  <button
                    type="button"
                    onClick={() => setShowSpoiler(false)}
                    className="absolute right-0 top-0 rounded-lg bg-black/50 p-1.5 text-gray-400 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                    title="Hide spoiler"
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (typeof onRequireAuth === "function" && onRequireAuth()) {
                  return;
                }
                setLiked(!liked);
              }}
              aria-label={`Like comment from ${comment.user}`}
              className={cn(
                "flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95",
                liked
                  ? palette.primaryText
                  : "text-gray-500 hover:text-gray-300",
              )}
            >
              <Heart className={cn("h-4 w-4", liked ? "fill-current" : "")} />
              {liked ? comment.likes + 1 : comment.likes}
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof onRequireAuth === "function") {
                  onRequireAuth();
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 transition-all hover:text-gray-300 active:scale-95"
            >
              <MessageSquare className="h-4 w-4" />
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FigmaCommentsSection({
  title = "Discussion",
  comments = [],
}) {
  const { palette } = useFigmaSite();
  const { isSignedIn } = useAuthStore();
  const [newComment, setNewComment] = useState("");
  const [isSpoilerTag, setIsSpoilerTag] = useState(false);
  const normalizedComments = Array.isArray(comments) ? comments : [];
  const requireAuth = () => {
    if (isSignedIn) {
      return false;
    }
    openAuthPrompt();
    return true;
  };

  return (
    <div className="mt-12 w-full pb-24">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
            <MessageSquare className={cn("h-6 w-6", palette.primaryText)} />
            {title}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              "Start the discussion",
              "Be first to call the twist",
              "Tell readers what you noticed",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold tracking-[0.01em] text-white/72"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-bold text-gray-400 transition-colors hover:text-white"
        >
          Sort by Top
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div
        className={cn(
          "mb-10 rounded-2xl border border-white/10 p-4 shadow-lg transition-colors md:p-5",
          palette.surface,
        )}
      >
        <div className="flex gap-3 md:gap-4">
          <img
            src={getFallbackImageUrl({ kind: "avatar", variant: "reader" })}
            alt="Current user"
            className="hidden h-10 w-10 rounded-full border-2 border-white/10 object-cover sm:block md:h-12 md:w-12"
          />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              onFocus={() => {
                requireAuth();
              }}
              placeholder="What do you think about this chapter?"
              className="min-h-[80px] w-full resize-none border-none bg-transparent text-sm text-white outline-none placeholder:text-gray-600 md:text-base"
            />
            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => setIsSpoilerTag(!isSpoilerTag)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors active:scale-95",
                  isSpoilerTag
                    ? "border-red-500/30 bg-red-500/20 text-red-500"
                    : "border-transparent bg-white/5 text-gray-400 hover:bg-white/10",
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Spoiler Tag
              </button>

              <button
                type="button"
                onClick={() => {
                  if (requireAuth()) {
                    return;
                  }
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-black text-white shadow-lg transition-all active:scale-95",
                  newComment.length > 0
                    ? palette.primaryBg
                    : "cursor-not-allowed bg-gray-800 text-gray-500",
                )}
              >
                Comment
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {normalizedComments.length > 0 ? (
        <div className="space-y-4">
          {normalizedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onRequireAuth={requireAuth}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "rounded-2xl border border-dashed p-6 text-center md:p-8",
            palette.surface,
            "border-white/10",
          )}
        >
          <p className="text-base font-bold text-white">
            Be the first to comment
          </p>
          <p className="mt-2 text-sm text-gray-400">
            No comments yet. Say what you think before everyone else catches up.
          </p>
        </div>
      )}

      {normalizedComments.length > 0 ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            className="rounded-full border border-gray-800 px-6 py-3 text-sm font-bold text-gray-400 transition-all hover:border-gray-600 hover:text-white active:scale-95"
          >
            Load More Comments
          </button>
        </div>
      ) : null}
    </div>
  );
}
