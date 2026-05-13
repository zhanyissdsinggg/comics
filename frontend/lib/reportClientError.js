function toStringSafe(value) {
  return typeof value === "string"
    ? value
    : value instanceof Error
      ? value.message
      : String(value || "");
}

export async function reportClientError(input = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    boundaryName: toStringSafe(
      input.boundaryName || input.errorBoundary || "unknown-boundary",
    ),
    message: toStringSafe(input.message || input.error),
    stack: toStringSafe(input.stack),
    componentStack: toStringSafe(input.componentStack),
    digest: toStringSafe(input.digest),
    href: window.location.href,
    userAgent: window.navigator?.userAgent || "",
    timestamp: new Date().toISOString(),
  };

  if (!payload.message.trim()) {
    return;
  }

  try {
    await fetch("/api/meta/frontend-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // Ignore reporting failures to avoid cascading UI errors.
  }
}
