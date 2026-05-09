import Link from "next/link";
import Image from "next/image";
import { createPageMetadata } from "../../lib/seo";
import {
  getPublicGenres,
} from "../../lib/matureContent";
import { loadSeriesCatalogSeoPayload } from "../../lib/storefrontSeo";
import { buildCreatorDirectory } from "../../lib/creatorDirectory";
import { normalizeGenreList } from "../../lib/coverPresentation";
import {
  buildCreatorEditorialHook,
  buildEditorialHook,
} from "../../lib/editorialHooks";
import {
  filterBlockedPublicCreators,
  filterBlockedPublicGenres,
  filterBlockedPublicSeries,
} from "../../lib/publicCatalogVisibility";
import {
  formatTitleCardCreator,
  formatTitleCardFormatStatus,
  formatTitleCardGenres,
} from "../../lib/titleCardText";

const FORMAT_OPTIONS = [
  { label: "All", value: "" },
  { label: "Comics", value: "comic" },
  { label: "Novels", value: "novel" },
];

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
];

function readSingleParam(searchParams, key) {
  if (searchParams && typeof searchParams.get === "function") {
    return String(searchParams.get(key) || "").trim();
  }
  const raw = searchParams?.[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value || "").trim();
}

function normalizeSearchParams(searchParams) {
  return {
    q: readSingleParam(searchParams, "q"),
    format: readSingleParam(searchParams, "format"),
    status: readSingleParam(searchParams, "status"),
    genre: readSingleParam(searchParams, "genre"),
  };
}

function normalizeSearchValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatus(value) {
  const normalized = normalizeSearchValue(value);
  if (normalized === "completed") {
    return "completed";
  }
  if (normalized === "ongoing") {
    return "ongoing";
  }
  return "";
}

function normalizeFormat(value) {
  const normalized = normalizeSearchValue(value);
  if (normalized === "comic" || normalized === "novel") {
    return normalized;
  }
  return "";
}

function buildQueryPath({ q = "", format = "", status = "", genre = "" }) {
  const params = new URLSearchParams();
  if (q) {
    params.set("q", q);
  }
  if (format) {
    params.set("format", format);
  }
  if (status) {
    params.set("status", status);
  }
  if (genre) {
    params.set("genre", genre);
  }
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}

function formatDisplayLabel(value) {
  const normalized = String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

function summarizeText(value, maxLength = 110) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3).trimEnd()}...`
    : normalized;
}

function buildSeriesSearchText(series) {
  return [
    series?.title,
    series?.author,
    series?.description,
    ...(Array.isArray(series?.genres) ? series.genres : []),
    ...(Array.isArray(series?.creatorCredits)
      ? series.creatorCredits.map((credit) => credit?.name)
      : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function buildCreatorSearchText(creator) {
  return [
    creator?.name,
    creator?.leadSummary,
    ...(Array.isArray(creator?.topGenres) ? creator.topGenres : []),
    ...(Array.isArray(creator?.series) ? creator.series.map((series) => series?.title) : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function getCoverAltText(title, format) {
  const normalizedTitle = String(title || "").trim();
  const normalizedFormat = normalizeFormat(format);

  if (normalizedTitle && normalizedFormat) {
    return `${formatDisplayLabel(normalizedFormat)} cover for ${normalizedTitle}`;
  }
  if (normalizedTitle) {
    return `Cover for ${normalizedTitle}`;
  }
  return "Series cover";
}

function scoreSeries(series) {
  return (
    (Date.parse(series?.updatedAt || 0) || 0) +
    Math.max(0, Number(series?.episodeCount || 0)) * 1000 +
    (normalizeStatus(series?.status) === "completed" ? 5000 : 0)
  );
}

function scoreCreator(creator) {
  return (
    Math.max(0, Number(creator?.readerProof || 0)) * 100 +
    Math.max(0, Number(creator?.titleCount || 0)) * 1000 +
    (Date.parse(creator?.latestUpdatedAt || 0) || 0)
  );
}

function sortSeries(items) {
  return [...items].sort((left, right) => {
    const delta = scoreSeries(right) - scoreSeries(left);
    if (delta !== 0) {
      return delta;
    }
    return String(left?.title || "").localeCompare(String(right?.title || ""));
  });
}

function sortCreators(items) {
  return [...items].sort((left, right) => {
    const delta = scoreCreator(right) - scoreCreator(left);
    if (delta !== 0) {
      return delta;
    }
    return String(left?.name || "").localeCompare(String(right?.name || ""));
  });
}

function takeUniqueSeries(items, limit, excludedIds = new Set()) {
  const uniqueItems = [];
  const seenIds = new Set(excludedIds);

  for (const series of items) {
    const id = String(series?.id || "").trim();
    if (!id || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    uniqueItems.push(series);

    if (uniqueItems.length >= limit) {
      break;
    }
  }

  return uniqueItems;
}

function SearchInput({ q, format, status, genre }) {
  return (
    <form
      action="/search"
      method="get"
      className="rounded-[28px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.03)] p-4 shadow-[0_18px_44px_rgba(8,6,20,0.2)] sm:p-5"
    >
      <label
        htmlFor="catalog-search-input"
        className="mb-2 block text-sm font-medium text-white/72"
      >
        Search stories
      </label>
      <div className="flex flex-col gap-3 lg:flex-row">
        <input
          id="catalog-search-input"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search titles, creators, or genres"
          className="min-h-[52px] w-full rounded-full border border-white/12 bg-[rgba(15,13,19,0.9)] px-4 text-sm text-white outline-none placeholder:text-white/32 focus:border-[rgba(255,79,154,0.26)]"
        />
        <input type="hidden" name="format" value={format} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="genre" value={genre} />
        <button
          type="submit"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[rgba(255,79,154,0.28)] bg-[linear-gradient(135deg,#ff4f9a_0%,#ff76ad_100%)] px-6 text-sm font-semibold text-[#1a0e16] shadow-[0_18px_36px_rgba(255,79,154,0.22)] transition-transform duration-150 hover:-translate-y-0.5"
        >
          Search
        </button>
      </div>
    </form>
  );
}

function FilterGroup({ title, options, currentValue, buildHref }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/42">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = currentValue === option.value;
          return (
            <Link
              key={`${title}-${option.label}`}
              href={buildHref(option.value)}
              className={`rounded-full px-3 py-2 text-sm transition-colors ${
                active
                  ? "border border-[rgba(255,79,154,0.26)] bg-[rgba(255,79,154,0.16)] text-white"
                  : "border border-white/12 bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function GenreFilters({ genres, currentGenre, buildHref }) {
  if (!Array.isArray(genres) || genres.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/42">
        Genres
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildHref("")}
          className={`rounded-full px-3 py-2 text-sm transition-colors ${
            !currentGenre
              ? "border border-[rgba(255,79,154,0.26)] bg-[rgba(255,79,154,0.16)] text-white"
              : "border border-white/12 bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white"
          }`}
        >
          All
        </Link>
        {genres.map((genre) => {
          const active = currentGenre === genre;
          const commonClassName = `rounded-full px-3 py-2 text-sm transition-colors ${
            active
              ? "border border-[rgba(255,79,154,0.26)] bg-[rgba(255,79,154,0.16)] text-white"
              : "border border-white/12 bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white"
          }`;
          return (
            <Link
              key={`genre-${genre}`}
              href={buildHref(genre)}
              className={commonClassName}
            >
              {genre}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ResultSeriesCard({ series }) {
  const description = summarizeText(buildEditorialHook(series, { maxLength: 108 }), 108);
  const formatStatusLine = formatTitleCardFormatStatus(
    series?.type || "",
    series?.status || "",
  );
  const genreLine = formatTitleCardGenres(series?.genres, { limit: 3 });
  const creatorLine = formatTitleCardCreator(
    series?.creatorCredits?.[0]?.name || series?.creator?.label || series?.author || "",
  );

  return (
    <Link
      href={`/series/${series.id}`}
      className="group grid gap-4 rounded-[28px] border border-[rgba(255,255,255,0.09)] bg-[linear-gradient(180deg,rgba(30,25,38,0.94)_0%,rgba(17,13,24,0.96)_100%)] p-4 shadow-[0_20px_56px_rgba(8,6,20,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_28px_72px_rgba(8,6,20,0.3)] sm:grid-cols-[132px_minmax(0,1fr)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] border border-white/10 bg-[#0f0d13]">
        {series?.coverUrl ? (
          <Image
            src={series.coverUrl}
            alt=""
            aria-hidden="true"
            fill
            sizes="132px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(180deg,#251f2f,#17131d)]" />
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <h2 className="text-[1.08rem] font-semibold tracking-[-0.03em] text-white">
            {series?.title || "Story"}
          </h2>
          {formatStatusLine ? (
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/44">
              {formatStatusLine}
            </p>
          ) : null}
          {genreLine ? (
            <p className="text-sm leading-6 text-white/64">{genreLine}</p>
          ) : null}
          {creatorLine ? (
            <p className="text-xs text-white/48">{creatorLine}</p>
          ) : null}
        </div>

        {description ? (
          <p className="text-sm leading-6 text-white/64">{description}</p>
        ) : null}

        <span className="inline-flex text-sm font-medium text-white/82">
          View title
        </span>
      </div>
    </Link>
  );
}

function ResultCreatorCard({ creator }) {
  const topGenres = Array.isArray(creator?.topGenres) ? creator.topGenres.slice(0, 3) : [];
  const description = summarizeText(buildCreatorEditorialHook(creator, { maxLength: 108 }), 108);

  return (
    <Link
      href={creator?.path || "/creators"}
      className="group grid gap-4 rounded-[28px] border border-[rgba(255,255,255,0.09)] bg-[linear-gradient(180deg,rgba(30,25,38,0.94)_0%,rgba(17,13,24,0.96)_100%)] p-4 shadow-[0_20px_56px_rgba(8,6,20,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_28px_72px_rgba(8,6,20,0.3)] sm:grid-cols-[132px_minmax(0,1fr)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] border border-white/10 bg-[#0f0d13]">
        {creator?.spotlightSeries?.coverUrl ? (
          <Image
            src={creator.spotlightSeries.coverUrl}
            alt={getCoverAltText(creator?.spotlightSeries?.title, creator?.spotlightSeries?.type)}
            fill
            sizes="132px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(180deg,#251f2f,#17131d)]" />
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.12em] text-white/42">
            Creator
          </p>
          <h2 className="text-[1.08rem] font-semibold tracking-[-0.03em] text-white">
            {creator?.name || "Creator"}
          </h2>
          {topGenres.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {topGenres.map((genre) => (
                <span
                  key={`${creator.slug}-${genre}`}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/68"
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {description ? (
          <p className="text-sm leading-6 text-white/64">{description}</p>
        ) : null}

        <span className="inline-flex text-sm font-medium text-white/82">
          View creator
        </span>
      </div>
    </Link>
  );
}

function ShelfSection({ title, ctaHref, ctaLabel, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-white">
          {title}
        </h2>
        {ctaHref ? (
          <Link href={ctaHref} className="text-sm text-white/68 hover:text-white">
            {ctaLabel}
          </Link>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {items.map((series) => (
          <ResultSeriesCard key={series.id} series={series} />
        ))}
      </div>
    </section>
  );
}

export async function generateMetadata({ searchParams }) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { q: query } = normalizeSearchParams(resolvedSearchParams);

  return createPageMetadata({
    title: query ? `Search: ${query}` : "Search Comics & Novels",
    description: query ? `Search results for ${query}.` : "Search Gush.",
    path: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
    robots: {
      index: false,
      follow: true,
    },
  });
}

export default async function Page({ searchParams }) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const rawParams = normalizeSearchParams(resolvedSearchParams);
  const q = rawParams.q;
  const format = normalizeFormat(rawParams.format);
  const status = normalizeStatus(rawParams.status);
  const genre = String(rawParams.genre || "").trim();
  const normalizedQuery = normalizeSearchValue(q);
  const normalizedGenre = normalizeSearchValue(genre);
  const hasActiveQuery = normalizedQuery.length > 0;
  const hasActiveFormat = format.length > 0;
  const hasActiveStatus = status.length > 0;
  const hasActiveGenre = normalizedGenre.length > 0;

  const catalogPayload = await loadSeriesCatalogSeoPayload({ includeAdult: false });
  const catalog = filterBlockedPublicSeries(
    Array.isArray(catalogPayload?.series) ? catalogPayload.series : [],
  );
  const creators = filterBlockedPublicCreators(buildCreatorDirectory(catalog));

  const allGenres = Array.from(
    new Set(
      getPublicGenres(
        filterBlockedPublicGenres(
          catalog
            .flatMap((series) => normalizeGenreList(series?.genres))
            .filter(Boolean),
        ),
        { includeMature: false },
      ),
    ),
  )
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 18);

  const filteredSeries = sortSeries(
    catalog.filter((series) => {
      if (format && normalizeFormat(series?.type) !== format) {
        return false;
      }

      if (status && normalizeStatus(series?.status) !== status) {
        return false;
      }

      if (hasActiveGenre) {
        const seriesGenres = normalizeGenreList(series?.genres).map((item) =>
          normalizeSearchValue(item),
        );
        if (!seriesGenres.includes(normalizedGenre)) {
          return false;
        }
      }

      if (!hasActiveQuery) {
        return true;
      }

      return normalizeSearchValue(buildSeriesSearchText(series)).includes(normalizedQuery);
    }),
  );

  const filteredCreators = normalizedQuery
    ? sortCreators(
        creators.filter((creator) =>
          normalizeSearchValue(buildCreatorSearchText(creator)).includes(normalizedQuery),
        ),
      )
    : [];

  const hasExplicitFilters = Boolean(
    hasActiveQuery || hasActiveFormat || hasActiveStatus || hasActiveGenre,
  );
  const showDefaultShelves = !hasExplicitFilters;
  const resultCount = filteredSeries.length + filteredCreators.length;
  const emptyTrending = takeUniqueSeries(sortSeries(catalog), 6);
  const emptyTrendingIds = new Set(emptyTrending.map((series) => series.id));
  const emptyUpdates = takeUniqueSeries(
    sortSeries(
      [...catalog].sort(
        (left, right) =>
          (Date.parse(right?.updatedAt || 0) || 0) -
          (Date.parse(left?.updatedAt || 0) || 0),
      ),
    ),
    4,
    emptyTrendingIds,
  );
  const emptyCompleted = takeUniqueSeries(
    sortSeries(
      catalog.filter((series) => normalizeStatus(series?.status) === "completed"),
    ),
    4,
    new Set(emptyUpdates.map((series) => series.id)),
  );
  const noResultGenres = allGenres
    .filter((item) => item !== genre)
    .slice(0, 6);
  const noResultPopular = emptyTrending.slice(0, 4);

  const buildFormatHref = (nextFormat) =>
    buildQueryPath({ q, format: nextFormat, status, genre });
  const buildStatusHref = (nextStatus) =>
    buildQueryPath({ q, format, status: nextStatus, genre });
  const buildGenreHref = (nextGenre) =>
    buildQueryPath({ q, format, status, genre: nextGenre });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0f0d13_0%,#130f18_44%,#17131d_100%)] text-white">
      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6 rounded-[32px] border border-[rgba(255,255,255,0.09)] bg-[rgba(17,13,24,0.78)] p-4 shadow-[0_28px_80px_rgba(8,6,20,0.28)] backdrop-blur-xl sm:p-6">
          <header className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              Search
            </p>
            <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.5rem]">
              Find your next obsession
            </h1>
            <p className="max-w-[40rem] text-sm leading-6 text-white/62">
              Search by mood, genre, format, or creator.
            </p>
          </header>

          <SearchInput q={q} format={format} status={status} genre={genre} />

          <div className="space-y-5 rounded-[28px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.03)] p-4 shadow-[0_18px_44px_rgba(8,6,20,0.2)] sm:p-5">
            <FilterGroup
              title="Format"
              options={FORMAT_OPTIONS}
              currentValue={format}
              buildHref={buildFormatHref}
            />
            <FilterGroup
              title="Status"
              options={STATUS_OPTIONS}
              currentValue={status}
              buildHref={buildStatusHref}
            />
            <GenreFilters
              genres={allGenres}
              currentGenre={genre}
              buildHref={buildGenreHref}
            />
          </div>

          {showDefaultShelves ? (
            <div className="space-y-10">
              <div data-testid="search-default-trending">
                <ShelfSection
                  title="Hot this week"
                  ctaHref="/rankings"
                  ctaLabel="See all"
                  items={emptyTrending}
                />
              </div>
              <div data-testid="search-default-updates">
                <ShelfSection
                  title="Fresh drops"
                  ctaHref="/search?status=ongoing"
                  ctaLabel="Browse all"
                  items={emptyUpdates}
                />
              </div>
              <div data-testid="search-default-completed">
                <ShelfSection
                  title="Binge this weekend"
                  ctaHref="/search?status=completed"
                  ctaLabel="More finished series"
                  items={emptyCompleted}
                />
              </div>
            </div>
          ) : resultCount === 0 ? (
            <section className="space-y-6 rounded-[28px] border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.03)] p-5 shadow-[0_18px_44px_rgba(8,6,20,0.2)] sm:p-6">
              <div className="space-y-2">
                <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
                  No exact match
                </h2>
                <p className="text-sm leading-6 text-white/62">
                  Try a broader term, switch filters, or jump into a genre below.
                </p>
              </div>

              {noResultGenres.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {noResultGenres.map((item) => (
                    <Link
                      key={`suggested-${item}`}
                      href={buildQueryPath({ q: "", format: "", status: "", genre: item })}
                      className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 text-sm text-white/74 hover:bg-white/[0.06] hover:text-white"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              ) : null}

              <ShelfSection title="Popular titles" items={noResultPopular} />
            </section>
          ) : (
            <div className="space-y-8">
              {filteredCreators.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-white">
                    Creators
                  </h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {filteredCreators.map((creator) => (
                      <ResultCreatorCard key={creator.slug} creator={creator} />
                    ))}
                  </div>
                </section>
              ) : null}

              {filteredSeries.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-white">
                    Titles
                  </h2>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {filteredSeries.map((series) => (
                      <ResultSeriesCard key={series.id} series={series} />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
