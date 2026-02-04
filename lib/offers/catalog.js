export const OFFERS = {
  unlock_single: {
    id: "unlock_single",
    type: "unlock",
    title: "Single Episode",
    episodes: 1,
    pricePts: 5,
    tag: "Standard",
  },
  unlock_pack_3: {
    id: "unlock_pack_3",
    type: "unlock",
    title: "3 Episode Pack",
    episodes: 3,
    pricePts: 12,
    tag: "Popular",
    savingsPct: 20,
  },
  unlock_pack_10: {
    id: "unlock_pack_10",
    type: "unlock",
    title: "10 Episode Pack",
    episodes: 10,
    pricePts: 35,
    tag: "Best value",
    savingsPct: 30,
  },
  points_pack_starter: {
    id: "points_pack_starter",
    type: "points",
    name: "Starter",
    paidPts: 50,
    bonusPts: 5,
    tag: "Best for trial",
  },
  points_pack_medium: {
    id: "points_pack_medium",
    type: "points",
    name: "Medium",
    paidPts: 100,
    bonusPts: 15,
    tag: "Popular",
  },
  points_pack_value: {
    id: "points_pack_value",
    type: "points",
    name: "Value",
    paidPts: 200,
    bonusPts: 40,
    tag: "Best value",
  },
  points_pack_mega: {
    id: "points_pack_mega",
    type: "points",
    name: "Mega",
    paidPts: 500,
    bonusPts: 120,
    tag: "Mega pack",
  },
  subscribe_basic: {
    id: "subscribe_basic",
    type: "subscribe",
    title: "Basic",
    price: "$4.99/mo",
    tag: "Starter",
  },
  subscribe_pro: {
    id: "subscribe_pro",
    type: "subscribe",
    title: "Pro",
    price: "$7.99/mo",
    tag: "Popular",
  },
  subscribe_vip: {
    id: "subscribe_vip",
    type: "subscribe",
    title: "VIP",
    price: "$12.99/mo",
    tag: "Best value",
  },
  first_purchase_bonus: {
    id: "first_purchase_bonus",
    type: "promo",
    title: "First Purchase Bonus",
    bonusMultiplier: 2,
    tag: "2x Bonus",
  },
};

export const UNLOCK_OFFERS = [
  OFFERS.unlock_single,
  OFFERS.unlock_pack_3,
  OFFERS.unlock_pack_10,
];

export const POINTS_PACKS = [
  OFFERS.points_pack_starter,
  OFFERS.points_pack_medium,
  OFFERS.points_pack_value,
  OFFERS.points_pack_mega,
];

export const SUBSCRIPTION_OFFERS = [
  OFFERS.subscribe_basic,
  OFFERS.subscribe_pro,
  OFFERS.subscribe_vip,
];
