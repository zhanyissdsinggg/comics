const FIGMA_EXACT_ROUTES = new Set([
  "/",
  "/account",
  "/comics",
  "/library",
  "/login",
  "/notifications",
  "/novels",
  "/rankings",
  "/search",
  "/settings",
  "/signin",
  "/store",
  "/subscribe",
]);

export function isFigmaRoute(pathname) {
  const normalizedPath = String(pathname || "").trim();
  if (!normalizedPath) {
    return false;
  }

  if (FIGMA_EXACT_ROUTES.has(normalizedPath)) {
    return true;
  }

  return (
    normalizedPath.startsWith("/read/") || normalizedPath.startsWith("/series/")
  );
}
