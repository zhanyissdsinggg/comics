import { NextResponse } from "next/server";
import { getUserIdFromCookies, markNotificationsRead } from "../../../../lib/serverStore";

export async function POST(request) {
  const userId = getUserIdFromCookies(request);
  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    payload = {};
  }

  const notificationIds = Array.isArray(payload.notificationIds)
    ? payload.notificationIds
    : [];
  const notifications = markNotificationsRead(userId, notificationIds);
  return NextResponse.json({ notifications });
}
