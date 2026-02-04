export const COUPON_CATALOG = {
  WELCOME10: {
    id: "WELCOME10",
    code: "WELCOME10",
    type: "DISCOUNT_PCT",
    value: 10,
    remainingUses: 1,
    label: "10% OFF",
  },
  FREE1: {
    id: "FREE1",
    code: "FREE1",
    type: "FREE_EPISODE",
    value: 1,
    remainingUses: 1,
    label: "1 Free Episode",
  },
  SAVE5: {
    id: "SAVE5",
    code: "SAVE5",
    type: "DISCOUNT_PTS",
    value: 5,
    remainingUses: 1,
    label: "Save 5 POINTS",
  },
};

export const COUPON_TYPES = {
  DISCOUNT_PCT: "DISCOUNT_PCT",
  DISCOUNT_PTS: "DISCOUNT_PTS",
  FREE_EPISODE: "FREE_EPISODE",
};
