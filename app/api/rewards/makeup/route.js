import { NextResponse } from "next/server";
import { getUserIdFromCookies, makeUpCheckIn } from "../../../../lib/rewardsStore";

export async function POST(request) {
  const userId = getUserIdFromCookies(request);
  const result = makeUpCheckIn(userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ rewards: result.rewards, wallet: result.wallet });
}

export const dynamic = "force-dynamic";
