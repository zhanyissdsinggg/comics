function getBaseUrl() {
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.API_BASE_URL;
  if (envBase) {
    return envBase.replace(/\/$/, "");
  }
  return "";
}

async function parseJson(response) {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}

export async function apiGet(path) {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.error || response.statusText,
      requestId: payload?.requestId,
      ...payload,
    };
  }
  return {
    ok: true,
    status: response.status,
    data: payload,
    requestId: payload?.requestId,
  };
}

export async function apiPost(path, body) {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const payload = await parseJson(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.error || response.statusText,
      requestId: payload?.requestId,
      ...payload,
    };
  }
  return {
    ok: true,
    status: response.status,
    data: payload,
    requestId: payload?.requestId,
  };
}
