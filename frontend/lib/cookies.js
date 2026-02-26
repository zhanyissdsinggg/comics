export function setCookie(name, value, options = {}) {
  if (typeof document === "undefined") {
    return;
  }
  const maxAge = options.maxAge ?? 60 * 60 * 24 * 365;
  const path = options.path ?? "/";
  const sameSite = options.sameSite ?? "Lax";
  const encoded = encodeURIComponent(value);
  document.cookie = `${name}=${encoded}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`;
}

export function getCookie(name) {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}
