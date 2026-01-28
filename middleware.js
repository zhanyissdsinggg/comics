import { NextResponse } from "next/server";
import { isAdultSeriesId } from "./lib/seriesCatalog";

const requireLoginForAdult = true;

function getReason(cookies) {
  const isSignedIn = cookies.get("mn_is_signed_in")?.value === "1";
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
  const seriesId = isSeriesPath ? pathname.split("/")[2] : null;
  const isAdultSeries = seriesId ? isAdultSeriesId(seriesId) : false;

  if (!isAdultPath && !isAdultSeries) {
    return NextResponse.next();
  }

  const reason = getReason(request.cookies);
  if (!reason) {
    return NextResponse.next();
  }

  const gateUrl = request.nextUrl.clone();
  gateUrl.pathname = "/adult-gate";
  const returnTo = `${pathname}${search || ""}`;
  gateUrl.searchParams.set("returnTo", returnTo);
  gateUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: ["/adult", "/series/:path*"],
};
