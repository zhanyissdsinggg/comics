import { NextResponse } from "next/server";
import { isAdultSeriesId } from "./lib/seriesCatalog";

const REGION_RULE_MAP = {
  global: "global",
  kr: "kr",
  us: "us",
};

const requireLoginForAdult = true;

function getReason(cookies) {
  const hasSession = Boolean(cookies.get("mn_session")?.value);
  const isSignedIn = hasSession || cookies.get("mn_is_signed_in")?.value === "1";
  const adultConfirmed = cookies.get("mn_adult_confirmed")?.value === "1";
  const adultMode = cookies.get("mn_adult_mode")?.value === "1";

  if (requireLoginForAdult && !isSignedIn) {
    return "NEED_LOGIN";
  }
  if (!adultConfirmed) {
    return "NEED_AGE_CONFIRM";
  }
  if (!adultMode) {
    return "NEED_ADULT_MODE";
  }
  return null;
}

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const isAdultPath = pathname === "/adult";
  const isSeriesPath = pathname.startsWith("/series/");
  const isReadPath = pathname.startsWith("/read/");
  const isStorePath = pathname.startsWith("/store");
  const isOrdersPath = pathname.startsWith("/orders");
  const isLibraryPath = pathname.startsWith("/library");
  const isNotificationsPath = pathname.startsWith("/notifications");
  const seriesId = isSeriesPath || isReadPath ? pathname.split("/")[2] : null;
  const isAdultSeries = seriesId ? isAdultSeriesId(seriesId) : false;

  const region = request.cookies.get("mn_region")?.value;
  const ruleKey = request.cookies.get("mn_age_rule")?.value;
  const response = NextResponse.next();
  if (!ruleKey && region && REGION_RULE_MAP[region]) {
    response.cookies.set("mn_age_rule", REGION_RULE_MAP[region], {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const hasSession = Boolean(request.cookies.get("mn_session")?.value);
  const requiresAuth = isOrdersPath || isLibraryPath || isNotificationsPath;

  if (requiresAuth && !hasSession) {
    const gateUrl = request.nextUrl.clone();
    gateUrl.pathname = "/";
    const returnTo = `${pathname}${search || ""}`;
    gateUrl.searchParams.set("returnTo", returnTo);
    gateUrl.searchParams.set("reason", "NEED_LOGIN");
    return NextResponse.redirect(gateUrl);
  }

  if (!isAdultPath && !isAdultSeries) {
    return response;
  }

  const reason = getReason(request.cookies);
  if (!reason) {
    return response;
  }

  const gateUrl = request.nextUrl.clone();
  gateUrl.pathname = "/adult-gate";
  const returnTo = `${pathname}${search || ""}`;
  gateUrl.searchParams.set("returnTo", returnTo);
  gateUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: [
    "/adult",
    "/series/:path*",
    "/read/:path*",
    "/store",
    "/orders",
    "/library",
    "/notifications",
  ],
};
