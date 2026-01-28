import { NextResponse } from "next/server";
import { getUserIdFromCookies, reportMissionEvent } from "../../../../lib/rewardsStore";

export async function POST(request) {
  const userId = getUserIdFromCookies(request);
  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    payload = {};
  }
  const eventType = payload.eventType;
  if (!eventType) {
    return NextResponse.json({ error: "MISSING_EVENT" }, { status: 400 });
  }
  const result = reportMissionEvent(userId, eventType);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ missions: result.missions });
}

export const dynamic = "force-dynamic";
