import { isAdultContent } from "./contentFilters";

const LOOP_GUARD_HEADER = "x-gush-api-proxy-hop";

function isSafeRetryMethod(method) {
  const normalized = String(method || "GET").toUpperCase();
  return normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS";
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function isSameOrigin(baseUrl, requestUrl) {
  const envBase =
    baseUrl ||
    "";

  const normalizedBase = normalizeBaseUrl(envBase);
  if (!normalizedBase) {
    return false;
  }

  try {
    const reqUrl = new URL(requestUrl);
    const baseUrl = new URL(normalizedBase);
    return baseUrl.protocol === reqUrl.protocol && baseUrl.host === reqUrl.host;
  } catch {
    return false;
  }
}

function getBackendCandidates(requestUrl) {
  const primary =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://127.0.0.1:4000";
  const configuredFallbacks = String(process.env.API_BASE_FALLBACKS || "")
    .split(",")
    .map((item) => normalizeBaseUrl(item))
    .filter(Boolean);

  const candidates = [primary, ...configuredFallbacks]
    .map((item) => normalizeBaseUrl(item))
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .filter((item) => !isSameOrigin(item, requestUrl));

  return candidates;
}

function shouldRetryWithFallback(requestMethod, requestPathname, responseStatus) {
  if (!isSafeRetryMethod(requestMethod)) {
    return false;
  }

  if (responseStatus >= 500) {
    return true;
  }
  if (responseStatus === 404 && /^\/api\/series\/[^/]+/.test(requestPathname)) {
    // Detail routes must exist; 404 often means wrong upstream service.
    return true;
  }
  return false;
}

async function forwardRequestToBackend(
  request,
  backendBase,
  requestBodyBuffer,
  overridePathname,
) {
  const url = new URL(request.url);
  const targetPathname = overridePathname || url.pathname;
  const targetUrl = new URL(`${targetPathname}${url.search}`, backendBase).toString();
  const method = request.method || "GET";
  const headers = stripHopByHopHeaders(request.headers);
  headers.set(LOOP_GUARD_HEADER, "1");
  headers.set("x-gush-api-proxy-upstream", backendBase);

  const body = ["GET", "HEAD"].includes(method.toUpperCase())
    ? undefined
    : requestBodyBuffer;

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  return response;
}

function stripHopByHopHeaders(headers) {
  const next = new Headers(headers);
  [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "host",
    "content-length",
  ].forEach((key) => next.delete(key));
  return next;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeAdultFilter(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "1" || normalized === "true") {
    return "adult";
  }
  if (normalized === "0" || normalized === "false") {
    return "normal";
  }
  return "";
}

function normalizeSeriesSearchPayload(payload, requestUrl) {
  const url = new URL(requestUrl);
  const params = url.searchParams;
  const source = Array.isArray(payload?.series)
    ? payload.series
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  const search = String(params.get("search") || "").trim().toLowerCase();
  const type = String(params.get("type") || "").trim();
  const status = String(params.get("status") || "").trim();
  const adultFilter = normalizeAdultFilter(params.get("adult"));
  const sortBy = String(params.get("sortBy") || "createdAt_desc").trim();
  const page = parsePositiveInt(params.get("page"), 1);
  const limit = Math.min(100, parsePositiveInt(params.get("limit"), 20));

  const filtered = source.filter((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }
    if (search) {
      const haystack = `${item.id || ""} ${item.title || ""}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    if (type && type !== "all" && String(item.type || "") !== type) {
      return false;
    }
    if (status && status !== "all" && String(item.status || "") !== status) {
      return false;
    }
    if (adultFilter === "adult" && !isAdultContent(item)) {
      return false;
    }
    if (adultFilter === "normal" && isAdultContent(item)) {
      return false;
    }
    return true;
  });

  const [sortFieldRaw, sortOrderRaw] = sortBy.split("_");
  const allowedSortFields = new Set(["createdAt", "updatedAt", "title", "rating", "ratingCount"]);
  const sortField = allowedSortFields.has(sortFieldRaw) ? sortFieldRaw : "createdAt";
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

  filtered.sort((a, b) => {
    const left = a?.[sortField];
    const right = b?.[sortField];
    if (sortField === "title") {
      const cmp = String(left || "").localeCompare(String(right || ""));
      return sortOrder === "asc" ? cmp : -cmp;
    }
    const leftVal = Number(left || 0);
    const rightVal = Number(right || 0);
    const cmp = leftVal === rightVal ? 0 : leftVal > rightVal ? 1 : -1;
    return sortOrder === "asc" ? cmp : -cmp;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return {
    series: paged,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function tryCompatFallback({
  request,
  requestMethod,
  requestPathname,
  requestBodyBuffer,
  backendBase,
}) {
  if (requestMethod !== "GET") {
    return null;
  }

  if (requestPathname === "/api/admin/support") {
    return forwardRequestToBackend(
      request,
      backendBase,
      requestBodyBuffer,
      "/api/admin/users/support",
    );
  }

  if (requestPathname === "/api/admin/series/search/advanced") {
    const fallback = await forwardRequestToBackend(
      request,
      backendBase,
      requestBodyBuffer,
      "/api/admin/series",
    );
    if (!fallback.ok) {
      return fallback;
    }

    const payload = await parseJsonSafe(fallback);
    const normalized = normalizeSeriesSearchPayload(payload, request.url);
    return new Response(JSON.stringify(normalized), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  return null;
}

export async function handler(request) {
  if (request.headers.get(LOOP_GUARD_HEADER) === "1") {
    return new Response(
      JSON.stringify({ error: "PROXY_LOOP_DETECTED" }),
      { status: 508, headers: { "Content-Type": "application/json" } },
    );
  }

  const backendCandidates = getBackendCandidates(request.url);
  if (!backendCandidates.length) {
    return new Response(
      JSON.stringify({ error: "INVALID_BACKEND_BASE_URL" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const requestPathname = new URL(request.url).pathname;
  const requestMethod = (request.method || "GET").toUpperCase();
  const requestBodyBuffer = ["GET", "HEAD"].includes(requestMethod)
    ? undefined
    : await request.arrayBuffer();
  let response = null;
  let responseBase = null;
  let lastError = null;

  for (let i = 0; i < backendCandidates.length; i += 1) {
    const base = backendCandidates[i];
    try {
      const next = await forwardRequestToBackend(request, base, requestBodyBuffer);
      response = next;
      responseBase = base;
      if (!shouldRetryWithFallback(requestMethod, requestPathname, next.status) || i === backendCandidates.length - 1) {
        break;
      }
    } catch (error) {
      lastError = error;
      if (!isSafeRetryMethod(requestMethod) || i === backendCandidates.length - 1) {
        break;
      }
    }
  }

  if (!response) {
    const message = lastError instanceof Error ? lastError.message : "UPSTREAM_UNAVAILABLE";
    return new Response(
      JSON.stringify({ error: "UPSTREAM_UNAVAILABLE", message }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (response.status === 404) {
    const compat = await tryCompatFallback({
      request,
      requestMethod,
      requestPathname,
      requestBodyBuffer,
      backendBase: responseBase || backendCandidates[0],
    });
    if (compat) {
      response = compat;
    }
  }

  return new Response(response.body, {
    status: response.status,
    headers: new Headers(response.headers),
  });
}
