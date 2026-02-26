import { COUPON_TYPES } from "./coupons/catalog";
import { getPlan } from "./subscriptions";

function applyDiscount(price, pct) {
  const next = Math.ceil(price * (1 - pct / 100));
  return Math.max(0, next);
}

function applyFixedDiscount(price, amount) {
  return Math.max(0, price - amount);
}

export function pickBestCoupon(coupons, price, method) {
  if (!Array.isArray(coupons) || coupons.length === 0) {
    return null;
  }
  const valid = coupons.filter((coupon) => (coupon.remainingUses ?? 1) > 0);
  if (valid.length === 0) {
    return null;
  }
  let best = null;
  let bestPrice = price;
  valid.forEach((coupon) => {
    if (method === "PACK" && coupon.type === COUPON_TYPES.FREE_EPISODE) {
      return;
    }
    let nextPrice = price;
    if (coupon.type === COUPON_TYPES.FREE_EPISODE) {
      nextPrice = 0;
    } else if (coupon.type === COUPON_TYPES.DISCOUNT_PCT) {
      nextPrice = applyDiscount(price, coupon.value || 0);
    } else if (coupon.type === COUPON_TYPES.DISCOUNT_PTS) {
      nextPrice = applyFixedDiscount(price, coupon.value || 0);
    }
    if (nextPrice < bestPrice) {
      best = coupon;
      bestPrice = nextPrice;
    }
  });
  return best ? { coupon: best, price: bestPrice } : null;
}

export function calculatePrice({
  basePrice,
  subscription,
  coupons,
  method = "WALLET",
  applyDailyFree = false,
}) {
  const plan = subscription?.planId ? getPlan(subscription.planId) : null;
  let finalPrice = basePrice;
  let discountPct = 0;
  let appliedCoupon = null;
  let appliedDailyFree = false;

  if (plan?.discountPct) {
    discountPct = plan.discountPct;
    finalPrice = applyDiscount(finalPrice, discountPct);
  }

  if (applyDailyFree && plan?.dailyFreeUnlocks && method === "WALLET") {
    finalPrice = 0;
    appliedDailyFree = true;
  }

  const couponPick =
    finalPrice > 0 ? pickBestCoupon(coupons, finalPrice, method) : null;
  if (couponPick) {
    appliedCoupon = couponPick.coupon;
    finalPrice = couponPick.price;
  }

  return {
    basePrice,
    finalPrice,
    discountPct,
    appliedCoupon,
    appliedDailyFree,
  };
}
