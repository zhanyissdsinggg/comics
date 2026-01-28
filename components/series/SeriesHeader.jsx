"use client";

import Cover from "../common/Cover";
import Pill from "../common/Pill";
import Chip from "../common/Chip";

export default function SeriesHeader({
  series,
  wallet,
  onContinue,
  onStart,
  onFollow,
  onAddToLibrary,
}) {
  const genres = series.genres || [];
  const badges = series.badges || [];
  const pricing = series.pricing || {};
  const isAdult = Boolean(series.adult);
  const totalPts = (wallet?.paidPts || 0) + (wallet?.bonusPts || 0);

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
            <button type="button" onClick={onContinue}>
              Continue
            </button>
          ) : null}
          {onStart ? (
            <button type="button" onClick={onStart}>
              Start
            </button>
          ) : null}
          {onFollow ? (
            <button type="button" onClick={onFollow}>
              Follow
            </button>
          ) : null}
          {onAddToLibrary ? (
            <button type="button" onClick={onAddToLibrary}>
              Add to Library
            </button>
          ) : null}
          <div className="series-pricing">
            <span>
              {pricing.episodePrice} {pricing.currency}
            </span>
            <span>TTF {series.ttf?.enabled ? "On" : "Off"}</span>
            <span>Total PTS {totalPts}</span>
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
