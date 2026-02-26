import { OFFERS, POINTS_PACKS } from "./catalog";

const DEFAULT_UNLOCK_EXPERIMENT = "unlock_offer_v1";
const DEFAULT_TOPUP_EXPERIMENT = "topup_offer_v1";
const DEFAULT_UPSELL_EXPERIMENT = "subscribe_upsell_v1";
const DEFAULT_READER_EXPERIMENT = "reader_paywall_v1";

function pickUnlockOffer(bucket, isSubscriber) {
  if (bucket === "B") {
    return "unlock_pack_3";
  }
  if (bucket === "C") {
    return isSubscriber ? "unlock_pack_10" : "unlock_pack_3";
  }
  return "unlock_single";
}

function pickTopupOffer(bucket, shortfallPts) {
  const sorted = [...POINTS_PACKS].sort(
    (a, b) => a.paidPts + a.bonusPts - (b.paidPts + b.bonusPts)
  );
  const target = shortfallPts > 0 ? shortfallPts : 1;
  const match = sorted.find(
    (pkg) => pkg.paidPts + pkg.bonusPts >= target
  );
  if (match) {
    return match.id;
  }
  return bucket === "C" ? "points_pack_mega" : "points_pack_value";
}

export function decideOffers(context) {
  const user = context?.user || {};
  const content = context?.content || {};
  const entry = context?.entry || "UNLOCK_MODAL";
  const bucketMap = context?.experiments?.bucketMap || {};

  const unlockBucket = bucketMap[DEFAULT_UNLOCK_EXPERIMENT] || "A";
  const topupBucket = bucketMap[DEFAULT_TOPUP_EXPERIMENT] || "B";
  const upsellBucket = bucketMap[DEFAULT_UPSELL_EXPERIMENT] || "A";
  const readerBucket = bucketMap[DEFAULT_READER_EXPERIMENT] || "A";

  const totalPts = (user.paidPts || 0) + (user.bonusPts || 0);
  const pricePts = content.pricePts || 0;
  const shortfall = Math.max(0, pricePts - totalPts);

  const recommendedUnlockOfferId = pickUnlockOffer(
    unlockBucket,
    Boolean(user.isSubscriber)
  );
  const recommendedTopupPackageId = pickTopupOffer(topupBucket, shortfall);
  const showSubscribeUpsell =
    !user.isSubscriber && (upsellBucket === "C" || entry === "READER_END");

  const priceAnchoringVariant = readerBucket;
  const ttfUpsellVariant = content.ttfEligible ? readerBucket : "A";
  const countdownVariant = readerBucket === "B" ? "B" : "A";
  const packHintVariant = readerBucket === "C" ? "C" : "A";

  return {
    recommendedUnlockOfferId,
    recommendedTopupPackageId,
    showSubscribeUpsell,
    priceAnchoringVariant,
    ttfUpsellVariant,
    countdownVariant,
    packHintVariant,
    bucketMap: {
      [DEFAULT_UNLOCK_EXPERIMENT]: unlockBucket,
      [DEFAULT_TOPUP_EXPERIMENT]: topupBucket,
      [DEFAULT_UPSELL_EXPERIMENT]: upsellBucket,
      [DEFAULT_READER_EXPERIMENT]: readerBucket,
    },
    recommendedUnlockOffer: OFFERS[recommendedUnlockOfferId],
    recommendedTopupOffer: OFFERS[recommendedTopupPackageId],
  };
}
