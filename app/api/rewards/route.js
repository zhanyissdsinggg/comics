import { NextResponse } from "next/server";
import {
  getRewardsState,
  getUserIdFromCookies,
} from "../../../lib/rewardsStore";

export async function GET(request) {
  const userId = getUserIdFromCookies(request);
  const rewards = getRewardsState(userId);
  return NextResponse.json({ rewards });
}

export const dynamic = "force-dynamic";
