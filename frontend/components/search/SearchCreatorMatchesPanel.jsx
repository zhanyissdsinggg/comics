"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cover from "../common/Cover";
import Pill from "../common/Pill";
import SurfacePanel from "../common/SurfacePanel";
import { buildCreatorDirectory } from "../../lib/creatorDirectory";
import { normalizeCreatorName } from "../../lib/creators";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";

function formatCompactCount(value) {
  const safeValue = Math.max(0, Number(value) || 0);
  return new Intl.NumberFormat("en-US", {
    notation: safeValue >= 1000 ? "compact" : "standard",
    maximumFractionDigits: safeValue >= 1000 ? 1 : 0,
  }).format(safeValue);
}

function normalizeSearchValue(value) {
  return normalizeCreatorName(String(value || "")).toLowerCase();
}

function includesNormalized(value, normalizedQuery) {
  if (!normalizedQuery) {
    return false;
  }

  return normalizeSearchValue(value).includes(normalizedQuery);
}

function highlight(text, query) {
  if (!query) {
    return text;
  }

  const source = String(text || "");
  const normalizedQuery = String(query).toLowerCase();
  const index = source.toLowerCase().indexOf(normalizedQuery);

  if (index < 0) {
    return source;
  }

  const before = source.slice(0, index);
  const match = source.slice(index, index + normalizedQuery.length);
  const after = source.slice(index + normalizedQuery.length);

  return (
    <>
      {before}
      <mark className="rounded bg-amber-200 px-1 text-slate-950">{match}</mark>
      {after}
    </>
  );
}

export default function SearchCreatorMatchesPanel({
  catalog = [],
  query = "",
  loading = false,
  resultsLength = 0,
  searchPath = "/search",
}) {
  const router = useRouter();
  const matchedCreators = useMemo(() => {
    const creatorDirectory = buildCreatorDirectory(catalog);
    const normalizedQuery = normalizeSearchValue(query);

    if (!normalizedQuery || creatorDirectory.length === 0) {
      return [];
    }

    const relaxMatchRules = !loading && resultsLength < 4;

    return creatorDirectory
      .map((creator) => {
        const normalizedName = normalizeSearchValue(creator.name);
        const exactNameMatch = normalizedName === normalizedQuery;
        const prefixNameMatch = normalizedName.startsWith(normalizedQuery);
        const includesNameMatch =
          normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);
        const spotlightTitleMatch = includesNormalized(creator.spotlightSeries?.title, normalizedQuery);
        const genreMatches = (Array.isArray(creator.topGenres) ? creator.topGenres : []).filter((genre) =>
          includesNormalized(genre, normalizedQuery),
        );
        const relatedTitleCount = (Array.isArray(creator.series) ? creator.series : []).filter((series) =>
          includesNormalized(series?.title, normalizedQuery),
        ).length;
        const hasPrimaryMatch = exactNameMatch || prefixNameMatch || includesNameMatch;
        const hasSecondaryMatch = spotlightTitleMatch || genreMatches.length > 0 || relatedTitleCount > 0;

        if (!hasPrimaryMatch && !(relaxMatchRules && hasSecondaryMatch)) {
          return null;
        }

        let matchLabel = "Creator match";
        let matchDescription =
          "This search lines up with a creator page, which is often the fastest way to find related series.";
        let matchScore = 0;

        if (exactNameMatch) {
          matchLabel = "Exact creator";
          matchDescription = "You searched for the creator directly, so their page is the best next click.";
          matchScore += 1200;
        } else if (prefixNameMatch) {
          matchLabel = "Creator name";
          matchDescription =
            "This search starts with the creator name, so opening their page should help faster than a narrow title list.";
          matchScore += 900;
        } else if (includesNameMatch) {
          matchLabel = "Creator name";
          matchDescription = "This search still matches the creator name closely enough that their page is worth opening first.";
          matchScore += 700;
        }

        if (spotlightTitleMatch) {
          if (!hasPrimaryMatch) {
            matchLabel = "Lead title";
            matchDescription =
              "The best title match comes from this creator, so their page gives you more good options right away.";
          }
          matchScore += 220;
        }

        if (!hasPrimaryMatch && genreMatches.length > 0) {
          matchLabel = "Genre bridge";
          matchDescription =
            "This search overlaps the creator's main genres, so their page is a better next stop than starting over.";
        }

        matchScore += genreMatches.length * 80;
        matchScore += relatedTitleCount * 45;
        matchScore += Math.min(creator.titleCount, 8) * 8;
        matchScore += Math.min(Math.log10(Math.max(creator.readerProof, 1)) * 40, 120);

        return {
          ...creator,
          matchedGenres: genreMatches.slice(0, 3),
          matchLabel,
          matchDescription,
          matchScore,
          relatedTitleCount,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (right.matchScore !== left.matchScore) {
          return right.matchScore - left.matchScore;
        }
        if (right.readerProof !== left.readerProof) {
          return right.readerProof - left.readerProof;
        }
        if (right.titleCount !== left.titleCount) {
          return right.titleCount - left.titleCount;
        }
        return left.name.localeCompare(right.name);
      })
      .slice(0, 3);
  }, [catalog, loading, query, resultsLength]);

  const handleCreatorClick = useCallback(
    (creator, entryPoint = "SEARCH_CREATOR_MATCH", campaignId = "creator_match_panel") => {
      if (!creator?.path) {
        return;
      }

      trackEvent("search_creator_match_click", {
        creatorName: creator.name,
        creatorSlug: creator.slug,
        entryPoint,
        campaignId,
        query: query || undefined,
        sourceSeriesId: creator.spotlightSeries?.id || undefined,
      });

      router.push(
        buildPathWithAttribution(creator.path, {
          entryPoint,
          campaignId,
          sourcePath: searchPath,
          sourceSeriesId: creator.spotlightSeries?.id || undefined,
          returnTo: creator.path,
        }),
      );
    },
    [query, router, searchPath],
  );

  const handleSeriesClick = useCallback(
    (seriesId, entryPoint = "SEARCH_CREATOR_MATCH_SERIES", campaignId = "creator_match_panel") => {
      if (!seriesId) {
        return;
      }

      const targetPath = `/series/${seriesId}`;
      trackEvent("search_result_click", {
        seriesId,
        entryPoint,
        campaignId,
        query: query || undefined,
      });

      router.push(
        buildPathWithAttribution(targetPath, {
          entryPoint,
          campaignId,
          sourcePath: searchPath,
          sourceSeriesId: seriesId,
          returnTo: targetPath,
        }),
      );
    },
    [query, router, searchPath],
  );

  if (!query || matchedCreators.length === 0) {
    return null;
  }

  const leadCreatorMatch = matchedCreators[0] || null;
  const creatorPanelTitle =
    resultsLength === 0
      ? "This looks more like a creator search."
      : resultsLength > 0 && resultsLength < 4
        ? "Open the creator page before the list runs dry."
        : "The creator behind this search should be visible early.";
  const creatorPanelHint =
    resultsLength === 0
      ? "If the exact title misses, the creator page is usually the quickest way back into the right shelf."
      : resultsLength > 0 && resultsLength < 4
        ? "A creator page gives you more room to branch out without restarting the search."
        : "If you are really looking for a writer or studio, this should feel like the smarter first click.";

  return (
    <SurfacePanel className="space-y-6" appearance="light" accent="blue">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Creator matches
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {creatorPanelTitle}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{creatorPanelHint}</p>
        </div>
        {leadCreatorMatch ? (
          <button
            type="button"
            onClick={() => handleCreatorClick(leadCreatorMatch)}
            className="rounded-full border border-black/8 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            View {leadCreatorMatch.name}
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {matchedCreators.map((creator) => (
          <article
            key={creator.slug}
            className="rounded-[28px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,248,252,0.98))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
          >
            <Cover
              tone={creator.spotlightSeries?.coverTone}
              coverUrl={creator.spotlightSeries?.coverUrl}
              className="h-56 rounded-[22px]"
            />
            <div className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {creator.matchLabel}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                    {highlight(creator.name, query)}
                  </h3>
                </div>
                <Pill appearance="light">
                  {creator.titleCount} title{creator.titleCount === 1 ? "" : "s"}
                </Pill>
              </div>

              {creator.spotlightSeries?.title ? (
                <p className="text-sm leading-6 text-slate-600">
                  Start with{" "}
                  <span className="font-medium text-slate-950">
                    {highlight(creator.spotlightSeries.title, query)}
                  </span>
                  , then move through the rest of this shelf.
                </p>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  Open the creator page to see the strongest related titles in one place.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {(creator.matchedGenres.length > 0 ? creator.matchedGenres : creator.topGenres)
                  .slice(0, 3)
                  .map((genre) => (
                    <span
                      key={`${creator.slug}-${genre}`}
                      className="rounded-full border border-black/8 bg-[#f8f9fc] px-2.5 py-1 text-xs text-slate-500"
                    >
                      {highlight(genre, query)}
                    </span>
                  ))}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span>{formatCompactCount(creator.readerProof)} readers</span>
                {creator.relatedTitleCount > 0 ? <span>{creator.relatedTitleCount} title matches</span> : null}
                {creator.completedCount > 0 ? <span>{creator.completedCount} completed</span> : null}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCreatorClick(creator)}
                  className="rounded-full border border-black/8 bg-white/84 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-black/12 hover:bg-white"
                >
                  View creator page
                </button>
                {creator.spotlightSeries?.id ? (
                  <button
                    type="button"
                    onClick={() => handleSeriesClick(creator.spotlightSeries.id)}
                    className="rounded-full border border-black/8 bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Read lead title
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </SurfacePanel>
  );
}
