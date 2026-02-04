"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYMENT_STATUS = exports.ORDER_STATUS = void 0;
exports.ORDER_STATUS = {
    PENDING: "PENDING",
    PAID: "PAID",
    FAILED: "FAILED",
    TIMEOUT: "TIMEOUT",
    REFUNDED: "REFUNDED",
    DISPUTED: "DISPUTED",
    CHARGEBACK: "CHARGEBACK",
};
exports.PAYMENT_STATUS = {
    AUTHORIZED: "AUTHORIZED",
    CAPTURED: "CAPTURED",
    FAILED: "FAILED",
    REFUNDED: "REFUNDED",
};
