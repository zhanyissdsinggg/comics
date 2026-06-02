"use client";

import Link from "next/link";
import { useMemo, useCallback } from "react";
import Cover from "../common/Cover";
import SurfacePanel from "../common/SurfacePanel";
import {
  storefrontBadgeClass,
  storefrontInfoCardClass,
  storefrontSecondaryButtonClass,
  storefrontSoftCardClass,
} from "../common/StorefrontPagePrimitives";
import { buildCreatorDirectory } from "../../lib/creatorDirectory";
import { normalizeCreatorName } from "../../lib/creators";
import { buildPathWithAttribution } from "../../lib/paymentAttribution";
import { filterBlockedPublicSeries } from "../../lib/publicCatalogVisibility";
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
      <mark className="rounded border border-[rgba(255,79,154,0.22)] bg-[rgba(255,79,154,0.16)] px-1 text-white">
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
    const creatorDirectory = buildCreatorDirectory(
      filterBlockedPublicSeries(catalog),
    );
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

        let matchLabel = "Creator";
        let matchDescription = "Creator and title match.";
        let matchScore = 0;

        if (exactNameMatch) {
          matchLabel = "Exact match";
          matchDescription = "Direct creator match.";
          matchScore += 1200;
        } else if (prefixNameMatch) {
          matchLabel = "Creator";
          matchDescription = "Name match.";
          matchScore += 900;
        } else if (includesNameMatch) {
          matchLabel = "Creator";
          matchDescription = "Close name match.";
          matchScore += 700;
        }

        if (spotlightTitleMatch) {
          if (!hasPrimaryMatch) {
            matchLabel = "Best Match";
            matchDescription = "Best title match.";
          }
          matchScore += 220;
        }

        if (!hasPrimaryMatch && genreMatches.length > 0) {
          matchLabel = "Genre";
          matchDescription = "Genre match.";
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
    resultsLength === 0 ? "Try a creator." : "Creator matches.";

  return (
    <SurfacePanel className="space-y-4" appearance="dark" accent="cyan">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
            Creators
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
            {creatorPanelTitle}
          </h2>
        </div>
        {leadCreatorMatch ? (
          <Link
            href={getCreatorHref(leadCreatorMatch)}
            onClick={() => handleCreatorClick(leadCreatorMatch)}
            className={`${storefrontSecondaryButtonClass} px-4`}
          >
            View creator
          </Link>
        ) : null}
      </div>

      <div
        className={`grid gap-4 ${matchedCreators.length > 1 ? "xl:grid-cols-2" : ""}`}
      >
        {matchedCreators.map((creator) => (
          <article
            key={creator.slug}
            className={`${storefrontInfoCardClass} rounded-[30px] bg-[linear-gradient(180deg,rgba(30,25,38,0.98)_0%,rgba(17,13,24,0.98)_100%)] p-4 text-white shadow-[0_20px_50px_rgba(8,6,20,0.28)]`}
          >
            <Cover
              tone={creator.spotlightSeries?.coverTone}
              coverUrl={creator.spotlightSeries?.coverUrl}
              className="h-48 rounded-[22px] border border-white/10"
            />
            <div className="mt-4 space-y-3">
              <div>
                <p className={`${storefrontBadgeClass} text-white/68`}>
                  {creator.matchLabel}
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-white">
                  {highlight(creator.name, query)}
                </h3>
              </div>

              {creator.spotlightSeries?.title ? (
                <p className="text-sm leading-6 text-white/68">
                  <span className="font-medium text-white">
                    {highlight(creator.spotlightSeries.title, query)}
                  </span>
                </p>
              ) : (
                <p className="text-sm leading-6 text-white/68">Creator</p>
              )}

              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.12em] text-white/55">
                {creator.matchDescription ? (
                  <span className={`${storefrontSoftCardClass} px-3 py-2 text-[11px] tracking-[0.16em] text-white/62`}>
                    {creator.matchDescription}
                  </span>
                ) : null}
                {creator.matchedGenres?.[0] ? (
                  <span className={`${storefrontSoftCardClass} px-3 py-2 text-[11px] tracking-[0.16em] text-white/62`}>
                    {creator.matchedGenres[0]}
                  </span>
                ) : null}
              </div>

              <div className="pt-1">
                <Link
                  href={getCreatorHref(creator)}
                  onClick={() => handleCreatorClick(creator)}
                  className={`${storefrontSecondaryButtonClass} px-3.5`}
                >
                  View creator
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SurfacePanel>
  );
}
