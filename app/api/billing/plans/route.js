import { NextResponse } from "next/server";
import { SUBSCRIPTION_PLANS } from "../../../../lib/subscriptions";

export const dynamic = "force-dynamic";

export async function GET() {
  const plans = Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
    id: plan.id,
    title: plan.title,
    discountPct: plan.discountPct,
    dailyFreeUnlocks: plan.dailyFreeUnlocks,
    ttfMultiplier: plan.ttfMultiplier,
    voucherPts: plan.voucherPts,
    price: plan.price,
    currency: plan.currency || "USD",
  }));

  return NextResponse.json({ plans });
}
