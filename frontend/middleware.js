import { NextResponse } from "next/server";
import {
  isBlockedPublicSeriesIdentifier,
  shouldBlockDemoContentInProduction,
} from "./lib/publicCatalogVisibility";

function shouldBlockRequest(pathname) {
  const normalizedPath = String(pathname || "")
    .trim()
    .toLowerCase();

  if (!normalizedPath) {
    return false;
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  const [root, seriesId, entryId] = segments;
  if (root !== "series" && root !== "read") {
    return false;
  }

  return [seriesId, entryId, normalizedPath].some((value) =>
    isBlockedPublicSeriesIdentifier(value),
  );
}

export function middleware(request) {
  if (!shouldBlockDemoContentInProduction()) {
    return NextResponse.next();
  }

  if (shouldBlockRequest(request.nextUrl.pathname)) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "cache-control": "no-store, max-age=0",
        "x-robots-tag": "noindex",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/series/:path*", "/read/:path*"],
};
