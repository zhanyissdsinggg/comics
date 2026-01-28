import { headers } from "next/headers";

function getBaseUrl() {
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  const requestHeaders = headers();
  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  return host ? `${protocol}://${host}` : "";
}

export async function fetchJson(path, options) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }
  return response.json();
}
