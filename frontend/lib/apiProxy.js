const LOOP_GUARD_HEADER = "x-gush-api-proxy-hop";
const DEFAULT_BACKEND_FALLBACKS = ["https://comics-production-07fa.up.railway.app"];

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
    "http://localhost:4000";
  const configuredFallbacks = String(process.env.API_BASE_FALLBACKS || "")
    .split(",")
    .map((item) => normalizeBaseUrl(item))
    .filter(Boolean);

  const candidates = [primary, ...configuredFallbacks, ...DEFAULT_BACKEND_FALLBACKS]
    .map((item) => normalizeBaseUrl(item))
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .filter((item) => !isSameOrigin(item, requestUrl));

  return candidates;
}

function shouldRetryWithFallback(requestPathname, responseStatus) {
  if (responseStatus >= 500) {
    return true;
  }
  if (responseStatus === 404 && /^\/api\/series\/[^/]+/.test(requestPathname)) {
    // Detail routes must exist; 404 often means wrong upstream service.
    return true;
  }
  return false;
}

async function forwardRequestToBackend(request, backendBase, requestBodyBuffer) {
  const url = new URL(request.url);
  const targetUrl = new URL(`${url.pathname}${url.search}`, backendBase).toString();
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
  let lastError = null;

  for (let i = 0; i < backendCandidates.length; i += 1) {
    const base = backendCandidates[i];
    try {
      const next = await forwardRequestToBackend(request, base, requestBodyBuffer);
      response = next;
      if (!shouldRetryWithFallback(requestPathname, next.status) || i === backendCandidates.length - 1) {
        break;
      }
    } catch (error) {
      lastError = error;
      if (i === backendCandidates.length - 1) {
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

  return new Response(response.body, {
    status: response.status,
    headers: new Headers(response.headers),
  });
}
