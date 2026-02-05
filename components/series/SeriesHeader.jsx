"use client";

import Cover from "../common/Cover";
import Pill from "../common/Pill";
import Chip from "../common/Chip";
import ShareButton from "../common/ShareButton";
import { getPlan } from "../../lib/subscriptions";

export default function SeriesHeader({
  series,
  wallet,
  previewHint,
  progress,
  onContinue,
  onStart,
  onFollowToggle,
  isFollowing,
  onAddToLibrary,
  onShare,
  onSubscribe,
  onStore,
  onTip,
}) {
  const genres = series.genres || [];
  const badges = series.badges || [];
  const pricing = series.pricing || {};
  const isAdult = Boolean(series.adult);
  const totalPts = (wallet?.paidPts || 0) + (wallet?.bonusPts || 0);
  const subscription = wallet?.subscription || null;
  const plan = subscription?.planId ? getPlan(subscription.planId) : null;
  const subDiscount = plan?.discountPct || subscription?.perks?.discountPct || 0;
  const dailyFree = wallet?.subscriptionUsage?.remaining ?? plan?.dailyFreeUnlocks ?? 0;
  const ttfSpeed = plan?.ttfMultiplier || subscription?.perks?.ttfMultiplier || null;
  const progressPercent =
    progress?.lastEpisodeId ? Math.round((progress.percent || 0) * 100) : 0;
  const hasFreeEpisodes = series.hasFreeEpisodes || series.freeEpisodeCount > 0;

  return (
    <header className="series-header">
      <div className="series-hero">
        <div className="series-cover">
          <Cover tone={series.coverTone} />
        </div>
        <div className="series-hero-info">
          <h1>{series.title || "Series"}</h1>
          <p>{series.description}</p>
          <div className="series-badges">
            {isAdult ? <Pill>18+</Pill> : null}
            {hasFreeEpisodes ? <Pill>Free to Read</Pill> : null}
            {badges.map((badge) => (
              <Pill key={badge}>{badge}</Pill>
            ))}
          </div>
          <div className="series-genres">
            {genres.map((genre) => (
              <Chip key={genre}>{genre}</Chip>
            ))}
          </div>
        </div>
        <div className="series-cta">
          {onContinue ? (
            <button
              type="button"
              onClick={onContinue}
              className="w-full min-h-[44px] rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95 active:bg-emerald-700"
              style={{ willChange: "transform" }}
            >
              Continue
            </button>
          ) : null}
          {onStart ? (
            <button
              type="button"
              onClick={onStart}
              className="w-full min-h-[44px] rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95 active:bg-emerald-700"
              style={{ willChange: "transform" }}
            >
              Start
            </button>
          ) : null}
          {onFollowToggle ? (
            <button
              type="button"
              onClick={onFollowToggle}
              className={`w-full min-h-[44px] rounded-full px-6 py-3 text-sm font-semibold transition-all active:scale-95 ${
                isFollowing
                  ? "border border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 active:bg-emerald-500/30"
                  : "border border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800 active:bg-neutral-700"
              }`}
              style={{ willChange: "transform" }}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          ) : null}
          {onAddToLibrary ? (
            <button
              type="button"
              onClick={onAddToLibrary}
              className="w-full min-h-[44px] rounded-full border border-neutral-700 bg-neutral-900 px-6 py-3 text-sm font-semibold text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-800 active:scale-95 active:bg-neutral-700"
              style={{ willChange: "transform" }}
            >
              Add to Library
            </button>
          ) : null}
          <ShareButton
            url={typeof window !== "undefined" ? window.location.href : ""}
            title={series.title || "Check out this series"}
            description={series.description || ""}
            className="w-full"
          />
          {/* 老王注释：打赏按钮 */}
          {onTip ? (
            <button
              type="button"
              onClick={onTip}
              className="w-full min-h-[44px] rounded-full border border-orange-500/20 bg-orange-500/10 px-6 py-3 text-sm font-semibold text-orange-400 transition-all hover:border-orange-500/40 hover:bg-orange-500/20 active:scale-95"
              style={{ willChange: "transform" }}
            >
              💝 打赏作者
            </button>
          ) : null}
          {progress?.lastEpisodeId ? (
            <div className="mt-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-xs text-neutral-300">
              <div>
                Last read: {progress.lastEpisodeId} - {progressPercent}% read
              </div>
              <div className="mt-2 h-1 w-full rounded-full bg-neutral-900">
                <div
                  className="h-full rounded-full bg-emerald-400/70"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
          {previewHint ? (
            <div className="mt-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-xs text-neutral-300">
              {previewHint}
            </div>
          ) : null}
          <div className="mt-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 text-xs text-neutral-300">
            {subscription?.active ? (
              <div>
                Subscriber perks active - Daily free remaining: {dailyFree}
                {ttfSpeed ? ` - TTF speed: ${Math.round(ttfSpeed * 100)}%` : ""}
              </div>
            ) : (
              <div>
                Subscribe to save {subDiscount || 20}% + daily free unlocks.
              </div>
            )}
          </div>
          {onSubscribe && !subscription?.active ? (
            <button type="button" onClick={onSubscribe}>
              Subscribe for perks
            </button>
          ) : null}
          {onStore ? (
            <button type="button" onClick={onStore}>
              Top up POINTS
            </button>
          ) : null}
          <div className="series-pricing">
            <span>
              {pricing.episodePrice} {pricing.currency}
            </span>
            <span>TTF {series.ttf?.enabled ? "On" : "Off"}</span>
            <span>Total POINTS {totalPts}</span>
          </div>
        </div>
      </div>

      <div className="series-meta">
        <span>Type: {series.type}</span>
        <span>Status: {series.status}</span>
        <span>Rating: {series.rating}</span>
      </div>
    </header>
  );
}
