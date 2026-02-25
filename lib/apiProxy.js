function getBackendBaseUrl(requestUrl) {
  const envBase =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:4000";
  const base = envBase.replace(/\/$/, "");
  try {
    const reqUrl = new URL(requestUrl);
    const baseUrl = new URL(base);
    // 老王注释：如果前后端在同一个域名（比如都在Vercel上），使用空字符串（相对路径）
    if (baseUrl.host === reqUrl.host) {
      return "";  // 返回空字符串，使用相对路径
    }
  } catch {
    // ignore parse errors
  }
  return base;
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
  const backendBase = getBackendBaseUrl(request.url);
  // 老王注释：backendBase可以是空字符串（相对路径），所以只检查null/undefined
  if (backendBase === null || backendBase === undefined) {
    return new Response(
      JSON.stringify({ error: "INVALID_BACKEND_BASE_URL" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const url = new URL(request.url);
  const targetUrl = `${backendBase}${url.pathname}${url.search}`;
  const method = request.method || "GET";
  const headers = stripHopByHopHeaders(request.headers);

  let body = undefined;
  if (!["GET", "HEAD"].includes(method.toUpperCase())) {
    body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
