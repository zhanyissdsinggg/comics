import { cookies } from "next/headers";

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/$/, "");
}

function getBaseUrl() {
  return normalizeBaseUrl(
    process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://127.0.0.1:4000",
  );
}

function buildCookieHeader(cookieStore) {
  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

export async function apiGetServer(path) {
  try {
    const cookieStore = await cookies();
    const response = await fetch(`${getBaseUrl()}${path}`, {
      cache: "no-store",
      headers: {
        Cookie: buildCookieHeader(cookieStore),
      },
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}
