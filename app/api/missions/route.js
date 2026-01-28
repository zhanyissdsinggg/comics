import { NextResponse } from "next/server";
import { getMissionsState, getUserIdFromCookies } from "../../../lib/rewardsStore";

export async function GET(request) {
  const userId = getUserIdFromCookies(request);
  const missions = getMissionsState(userId);
  return NextResponse.json({ missions });
}

export const dynamic = "force-dynamic";
