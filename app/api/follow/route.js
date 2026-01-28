import { NextResponse } from "next/server";
import {
  getFollowedSeriesIds,
  getUserIdFromCookies,
  setFollowedSeriesIds,
  getNotifications,
} from "../../../lib/serverStore";

export async function GET(request) {
  const userId = getUserIdFromCookies(request);
  const followedSeriesIds = getFollowedSeriesIds(userId);
  return NextResponse.json({ followedSeriesIds });
}

export async function POST(request) {
  const userId = getUserIdFromCookies(request);
  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    payload = {};
  }

  const seriesId = payload.seriesId;
  const action = payload.action;
  if (!seriesId || !action) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const current = getFollowedSeriesIds(userId);
  let nextIds = current;
  if (action === "FOLLOW") {
    nextIds = setFollowedSeriesIds(userId, [...current, seriesId]);
  } else if (action === "UNFOLLOW") {
    nextIds = setFollowedSeriesIds(
      userId,
      current.filter((id) => id !== seriesId)
    );
  } else {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  getNotifications(userId, nextIds);
  return NextResponse.json({ followedSeriesIds: nextIds });
}
