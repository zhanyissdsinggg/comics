import { NextResponse } from "next/server";
import { addOrder, getOrders, getUserIdFromCookies } from "../../../lib/serverStore";
import { ERROR_CODES, buildErrorPayload } from "../../../lib/errors";
import { createRequestId, logError } from "../../../lib/logger";

export async function GET(request) {
  const requestId = createRequestId();
  const userId = getUserIdFromCookies(request);
  const orders = getOrders(userId);
  return NextResponse.json({ orders, requestId });
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

  const packageId = payload.packageId;
  const amount = payload.amount;
  const currency = payload.currency || "PTS";

  if (!packageId || !amount) {
    return NextResponse.json(
      { ...buildErrorPayload(ERROR_CODES.INVALID_REQUEST), requestId },
      { status: 400 }
    );
  }

  try {
    const order = addOrder(userId, { packageId, amount, currency });
    return NextResponse.json({ order, requestId });
  } catch (err) {
    logError("order_create_failed", { requestId, error: err?.message });
    return NextResponse.json(
      { ...buildErrorPayload(ERROR_CODES.INTERNAL), requestId },
      { status: 500 }
    );
  }
}
