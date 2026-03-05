const LOOP_GUARD_HEADER = "x-gush-api-proxy-hop";

function getBackendBaseUrl(requestUrl) {
  const envBase =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:4000";

  const normalizedBase = envBase.replace(/\/$/, "");

  try {
    const reqUrl = new URL(requestUrl);
    const baseUrl = new URL(normalizedBase);
    if (baseUrl.protocol === reqUrl.protocol && baseUrl.host === reqUrl.host) {
      // NOTE: cleaned corrupted comment.
      return null;
    }
  } catch {
    return null;
  }

  return normalizedBase;
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

  const backendBase = getBackendBaseUrl(request.url);
  if (!backendBase) {
    return new Response(
      JSON.stringify({ error: "INVALID_BACKEND_BASE_URL" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const url = new URL(request.url);
  const targetUrl = new URL(`${url.pathname}${url.search}`, backendBase).toString();
  const method = request.method || "GET";
  const headers = stripHopByHopHeaders(request.headers);
  headers.set(LOOP_GUARD_HEADER, "1");

  let body;
  if (!["GET", "HEAD"].includes(method.toUpperCase())) {
    body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  return new Response(response.body, {
    status: response.status,
    headers: new Headers(response.headers),
  });
}