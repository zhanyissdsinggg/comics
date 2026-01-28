import { NextResponse } from "next/server";
import {
  addOrder,
  getUserIdFromCookies,
  getWallet,
  setWallet,
} from "../../../../lib/serverStore";

export async function POST(request) {
  const userId = getUserIdFromCookies(request);
  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    payload = {};
  }

  const packageId = payload.packageId || request.nextUrl.searchParams.get("packageId");
  if (!packageId) {
    return NextResponse.json({ error: "MISSING_PACKAGE" }, { status: 400 });
  }

  const wallet = getWallet(userId);
  const topupMap = {
    starter: { paidPts: 50, bonusPts: 5 },
    value: { paidPts: 120, bonusPts: 20 },
    premium: { paidPts: 300, bonusPts: 60 },
  };
  const topup = topupMap[packageId] || topupMap.starter;
  const nextWallet = {
    ...wallet,
    paidPts: (wallet.paidPts || 0) + topup.paidPts,
    bonusPts: (wallet.bonusPts || 0) + topup.bonusPts,
  };
  setWallet(userId, nextWallet);
  const order = addOrder(userId, {
    packageId,
    amount: topup.paidPts + topup.bonusPts,
    currency: "PTS",
  });
  return NextResponse.json({ wallet: nextWallet, order });
}
