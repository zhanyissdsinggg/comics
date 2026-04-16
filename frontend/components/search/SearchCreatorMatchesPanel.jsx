"use client";

import Link from "next/link";
import { useMemo, useCallback } from "react";
import Cover from "../common/Cover";
import SurfacePanel from "../common/SurfacePanel";
import { buildCreatorDirectory } from "../../lib/creatorDirectory";
import { normalizeCreatorName } from "../../lib/creators";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { trackEvent } from "../../lib/trackEvent";

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
      <mark className="rounded bg-[rgba(255,255,255,0.98)] px-1 text-slate-950">
        {match}
      </mark>
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
          normalizedName.includes(normalizedQuery) ||
          normalizedQuery.includes(normalizedName);
        const spotlightTitleMatch = includesNormalized(
          creator.spotlightSeries?.title,
          normalizedQuery,
        );
        const genreMatches = (
          Array.isArray(creator.topGenres) ? creator.topGenres : []
        ).filter((genre) => includesNormalized(genre, normalizedQuery));
        const relatedTitleCount = (
          Array.isArray(creator.series) ? creator.series : []
        ).filter((series) =>
          includesNormalized(series?.title, normalizedQuery),
        ).length;
        const hasPrimaryMatch =
          exactNameMatch || prefixNameMatch || includesNameMatch;
        const hasSecondaryMatch =
          spotlightTitleMatch ||
          genreMatches.length > 0 ||
          relatedTitleCount > 0;

        if (!hasPrimaryMatch && !(relaxMatchRules && hasSecondaryMatch)) {
          return null;
        }

        let matchLabel = "Creator match";
        let matchDescription =
          "Matched creator and related titles.";
        let matchScore = 0;

        if (exactNameMatch) {
          matchLabel = "Exact creator";
          matchDescription =
            "You searched for the creator directly, so their page is the clearest next stop.";
          matchScore += 1200;
        } else if (prefixNameMatch) {
          matchLabel = "Creator name";
          matchDescription =
            "This search starts with the creator name, so their page should open the shelf up cleanly.";
          matchScore += 900;
        } else if (includesNameMatch) {
          matchLabel = "Creator name";
          matchDescription =
            "This search still matches the creator name closely enough that their page is worth opening.";
          matchScore += 700;
        }

        if (spotlightTitleMatch) {
          if (!hasPrimaryMatch) {
            matchLabel = "Lead title";
            matchDescription =
              "The strongest title match comes from this creator, so their page keeps related work close.";
          }
          matchScore += 220;
        }

        if (!hasPrimaryMatch && genreMatches.length > 0) {
          matchLabel = "Genre bridge";
          matchDescription =
            "This search overlaps the creator's main genres, so their page is a natural next stop.";
        }

        matchScore += genreMatches.length * 80;
        matchScore += relatedTitleCount * 45;
        matchScore += Math.min(creator.titleCount, 8) * 8;
        matchScore += Math.min(
          Math.log10(Math.max(creator.readerProof, 1)) * 40,
          120,
        );

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
      .slice(0, resultsLength === 0 ? 3 : 2);
  }, [catalog, loading, query, resultsLength]);

  const getCreatorHref = useCallback(
    (
      creator,
      entryPoint = "SEARCH_CREATOR_MATCH",
      campaignId = "creator_match_panel",
    ) => {
      if (!creator?.path) {
        return "/creators";
      }

      return buildPathWithAttribution(creator.path, {
        entryPoint,
        campaignId,
        sourcePath: searchPath,
        sourceSeriesId: creator.spotlightSeries?.id || undefined,
        returnTo: creator.path,
      });
    },
    [searchPath],
  );

  const handleCreatorClick = useCallback(
    (
      creator,
      entryPoint = "SEARCH_CREATOR_MATCH",
      campaignId = "creator_match_panel",
    ) => {
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
    },
    [query],
  );

  const shouldShowPanel = Boolean(query) && !loading && resultsLength < 4;

  if (!shouldShowPanel || matchedCreators.length === 0) {
    return null;
  }

  const leadCreatorMatch = matchedCreators[0] || null;
  const creatorPanelTitle =
    resultsLength === 0 ? "No title match." : "Creator matches.";

  return (
    <SurfacePanel className="space-y-4" appearance="light" accent="blue">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Creators
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
            {creatorPanelTitle}
          </h2>
        </div>
        {leadCreatorMatch ? (
          <Link
            href={getCreatorHref(leadCreatorMatch)}
            onClick={() => handleCreatorClick(leadCreatorMatch)}
            className="rounded-full bg-[color:var(--gush-ink-strong)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.08)] transition-colors hover:bg-black/82"
          >
            Open creator
          </Link>
        ) : null}
      </div>

      <div
        className={`grid gap-4 ${matchedCreators.length > 1 ? "xl:grid-cols-2" : ""}`}
      >
        {matchedCreators.map((creator) => (
          <article
            key={creator.slug}
            className="rounded-[30px] border border-[color:var(--gush-border)] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
          >
            <Cover
              tone={creator.spotlightSeries?.coverTone}
              coverUrl={creator.spotlightSeries?.coverUrl}
              className="h-48 rounded-[22px]"
            />
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {creator.matchLabel}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-950">
                  {highlight(creator.name, query)}
                </h3>
              </div>

              {creator.spotlightSeries?.title ? (
                <p className="text-sm leading-6 text-slate-600">
                  Start with{" "}
                  <span className="font-medium text-slate-950">
                    {highlight(creator.spotlightSeries.title, query)}
                  </span>
                  .
                </p>
              ) : (
                <p className="text-sm leading-6 text-slate-600">
                  Creator page
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span>
                  {creator.titleCount} title
                  {creator.titleCount === 1 ? "" : "s"}
                </span>
                {creator.completedCount > 0 ? (
                  <span>{creator.completedCount} completed</span>
                ) : null}
                {creator.matchedGenres?.[0] ? (
                  <span>{creator.matchedGenres[0]}</span>
                ) : null}
              </div>

              <div className="pt-1">
                <Link
                  href={getCreatorHref(creator)}
                  onClick={() => handleCreatorClick(creator)}
                  className="rounded-full border border-[color:var(--gush-border)] bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)]"
                >
                  Open creator
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SurfacePanel>
  );
}
