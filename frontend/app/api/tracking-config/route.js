const DEFAULT_TRACKING_RESPONSE = {
  config: {
    values: {},
    updatedAt: null,
  },
};

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/$/, "");
}

function getBackendCandidates() {
  const primary =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://127.0.0.1:4000";
  const configuredFallbacks = String(process.env.API_BASE_FALLBACKS || "")
    .split(",")
    .map((item) => normalizeBaseUrl(item))
    .filter(Boolean);

  return [primary, ...configuredFallbacks]
    .map((item) => normalizeBaseUrl(item))
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function isValidTrackingPayload(payload) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      payload.config &&
      typeof payload.config === "object" &&
      payload.config.values &&
      typeof payload.config.values === "object",
  );
}

async function fetchTrackingConfig(backendBase) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${backendBase}/api/tracking`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => null);
    return isValidTrackingPayload(payload) ? payload : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  const backendCandidates = getBackendCandidates();

  for (const backendBase of backendCandidates) {
    const payload = await fetchTrackingConfig(backendBase);
    if (payload) {
      return jsonResponse(payload, 200);
    }
  }

  return jsonResponse(DEFAULT_TRACKING_RESPONSE, 200, {
    "x-gush-tracking-fallback": "1",
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}
