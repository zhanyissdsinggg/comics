import { NextResponse } from "next/server";
import {
  applyUnlock,
  checkRateLimit,
  getEntitlement,
  getEpisodeById,
  getUserIdFromCookies,
  getWallet,
  previewChargeWallet,
  setEntitlement,
  setIdempotencyRecord,
  getIdempotencyRecord,
  setWallet,
} from "../../../lib/serverStore";
import { ERROR_CODES, buildErrorPayload } from "../../../lib/errors";
import { createRequestId, logError, logInfo, logWarn } from "../../../lib/logger";

export async function GET(request) {
  const requestId = createRequestId();
  const userId = getUserIdFromCookies(request);
  const seriesId = request.nextUrl.searchParams.get("seriesId");
  if (!seriesId) {
    return NextResponse.json(
      { ...buildErrorPayload(ERROR_CODES.INVALID_REQUEST), requestId },
      { status: 400 }
    );
  }
  const entitlement = getEntitlement(userId, seriesId);
  return NextResponse.json({ entitlement, requestId });
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

  const seriesId = payload.seriesId;
  const episodeId = payload.episodeId;
  const method = payload.method || "WALLET";
  const idempotencyKey =
    payload.idempotencyKey || request.headers.get("Idempotency-Key");

  if (idempotencyKey) {
    const cached = getIdempotencyRecord(userId, idempotencyKey);
    if (cached) {
      logInfo("unlock_idempotent_hit", { requestId: cached.body?.requestId });
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  const storeIdempotent = (status, body) => {
    if (idempotencyKey) {
      setIdempotencyRecord(userId, idempotencyKey, { status, body });
    }
  };

  if (!seriesId || !episodeId) {
    return NextResponse.json(
      { ...buildErrorPayload(ERROR_CODES.INVALID_REQUEST), requestId },
      { status: 400 }
    );
  }

  const entitlement = getEntitlement(userId, seriesId);
  if (entitlement.unlockedEpisodeIds.includes(episodeId)) {
    const body = { ok: true, entitlement, requestId };
    if (idempotencyKey) {
      setIdempotencyRecord(userId, idempotencyKey, { status: 200, body });
    }
    return NextResponse.json(body);
  }

  const episode = getEpisodeById(seriesId, episodeId);
  if (!episode) {
    return NextResponse.json(
      { ...buildErrorPayload(ERROR_CODES.INVALID_REQUEST), requestId },
      { status: 404 }
    );
  }

  const rate = checkRateLimit(userId, "unlock", 30, 60);
  if (!rate.ok) {
    logWarn("unlock_rate_limited", { userId, requestId });
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

  if (method === "TTF") {
    const readyAt = episode.ttfReadyAt ? Date.parse(episode.ttfReadyAt) : null;
    const now = Date.now();
    if (!episode.ttfEligible || !readyAt || now < readyAt) {
      const body = {
        ...buildErrorPayload(ERROR_CODES.TTF_NOT_READY),
        requestId,
      };
      storeIdempotent(409, body);
      return NextResponse.json(body, { status: 409 });
    }
    const nextEntitlement = applyUnlock(entitlement, episodeId);
    try {
      setEntitlement(userId, seriesId, nextEntitlement);
    } catch (err) {
      logError("unlock_ttf_failed", { requestId, error: err?.message });
      return NextResponse.json(
        { ...buildErrorPayload(ERROR_CODES.INTERNAL), requestId },
        { status: 500 }
      );
    }
    const body = { ok: true, entitlement: nextEntitlement, requestId };
    storeIdempotent(200, body);
    return NextResponse.json(body);
  }

  const pricePts = episode.pricePts || 0;
  const currentWallet = getWallet(userId);
  const chargeResult = previewChargeWallet(currentWallet, pricePts);
  if (!chargeResult.ok) {
    const body = {
      ...buildErrorPayload(ERROR_CODES.INSUFFICIENT_POINTS, {
        shortfallPts: chargeResult.shortfallPts,
      }),
      requestId,
    };
    storeIdempotent(402, body);
    return NextResponse.json(body, { status: 402 });
  }

  const nextEntitlement = applyUnlock(entitlement, episodeId);
  try {
    setWallet(userId, chargeResult.wallet);
    setEntitlement(userId, seriesId, nextEntitlement);
  } catch (err) {
    logError("unlock_wallet_failed", { requestId, error: err?.message });
    return NextResponse.json(
      { ...buildErrorPayload(ERROR_CODES.INTERNAL), requestId },
      { status: 500 }
    );
  }

  const body = {
    ok: true,
    entitlement: nextEntitlement,
    wallet: chargeResult.wallet,
    requestId,
  };
  storeIdempotent(200, body);
  return NextResponse.json(body);
}
