import { NextResponse } from "next/server";
import {
  addOrder,
  checkRateLimit,
  getUserIdFromCookies,
  getWallet,
  setWallet,
} from "../../../lib/serverStore";
import { ERROR_CODES, buildErrorPayload } from "../../../lib/errors";
import { createRequestId, logError, logWarn } from "../../../lib/logger";

export async function GET(request) {
  const requestId = createRequestId();
  const userId = getUserIdFromCookies(request);
  const wallet = getWallet(userId);
  return NextResponse.json({ wallet, requestId });
}

export async function POST(request) {
  const requestId = createRequestId();
  const userId = getUserIdFromCookies(request);
  let payload = {};
  try {
    payload = await request.json();
  } catch (err) {
    payload = {};
  }

  const packageId = payload.packageId || request.nextUrl.searchParams.get("packageId");
  if (!packageId) {
    return NextResponse.json(
      { ...buildErrorPayload(ERROR_CODES.INVALID_REQUEST), requestId },
      { status: 400 }
    );
  }

  const rate = checkRateLimit(userId, "topup", 10, 60);
  if (!rate.ok) {
    logWarn("topup_rate_limited", { userId, requestId });
    return NextResponse.json(
      {
        ...buildErrorPayload(ERROR_CODES.RATE_LIMITED, {
          retryAfterSec: rate.retryAfterSec,
        }),
        requestId,
      },
      { status: 429 }
    );
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
  try {
    setWallet(userId, nextWallet);
    const order = addOrder(userId, {
      packageId,
      amount: topup.paidPts + topup.bonusPts,
      currency: "PTS",
    });
    return NextResponse.json({ wallet: nextWallet, order, requestId });
  } catch (err) {
    logError("topup_failed", { requestId, error: err?.message });
    return NextResponse.json(
      { ...buildErrorPayload(ERROR_CODES.INTERNAL), requestId },
      { status: 500 }
    );
  }
}
