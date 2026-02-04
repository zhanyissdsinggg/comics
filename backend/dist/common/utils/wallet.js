"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chargeWallet = chargeWallet;
function chargeWallet(wallet, pricePts) {
    const total = ((wallet === null || wallet === void 0 ? void 0 : wallet.paidPts) || 0) + ((wallet === null || wallet === void 0 ? void 0 : wallet.bonusPts) || 0);
    const shortfall = pricePts - total;
    if (shortfall > 0) {
        return { ok: false, shortfallPts: shortfall };
    }
    let paidPts = (wallet === null || wallet === void 0 ? void 0 : wallet.paidPts) || 0;
    let bonusPts = (wallet === null || wallet === void 0 ? void 0 : wallet.bonusPts) || 0;
    let remaining = pricePts;
    const useBonus = Math.min(bonusPts, remaining);
    bonusPts -= useBonus;
    remaining -= useBonus;
    const usePaid = Math.min(paidPts, remaining);
    paidPts -= usePaid;
    remaining -= usePaid;
    return { ok: true, wallet: { ...wallet, paidPts, bonusPts } };
}
