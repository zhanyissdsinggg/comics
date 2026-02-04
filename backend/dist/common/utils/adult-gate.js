"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBool = parseBool;
exports.checkAdultGate = checkAdultGate;
function parseBool(value) {
    if (value === undefined || value === null) {
        return null;
    }
    if (value === "1" || value === "true") {
        return true;
    }
    if (value === "0" || value === "false") {
        return false;
    }
    return null;
}
function checkAdultGate(cookies) {
    const requireLoginForAdult = true;
    const isSignedIn = cookies.mn_is_signed_in === "1";
    const adultConfirmed = cookies.mn_adult_confirmed === "1";
    const isAdultMode = cookies.mn_adult_mode === "1";
    if (requireLoginForAdult && !isSignedIn) {
        return { ok: false, reason: "NEED_LOGIN" };
    }
    if (!adultConfirmed) {
        return { ok: false, reason: "NEED_AGE_CONFIRM" };
    }
    if (!isAdultMode) {
        return { ok: false, reason: "NEED_ADULT_MODE" };
    }
    return { ok: true, reason: "OK" };
}
