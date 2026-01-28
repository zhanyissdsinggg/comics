import { NextResponse } from "next/server";
import { claimMission, getUserIdFromCookies } from "../../../../lib/rewardsStore";

export async function POST(request) {
  const userId = getUserIdFromCookies(request);
  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    payload = {};
  }
  const missionId = payload.missionId;
  if (!missionId) {
    return NextResponse.json({ error: "MISSING_MISSION" }, { status: 400 });
  }
  const result = claimMission(userId, missionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ missions: result.missions, wallet: result.wallet });
}

export const dynamic = "force-dynamic";
