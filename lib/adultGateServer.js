const requireLoginForAdult = true;

export function checkAdultGate(request) {
  const cookies = request?.cookies;
  const hasSession = Boolean(cookies?.get("mn_session")?.value);
  const isSignedIn = hasSession || cookies?.get("mn_is_signed_in")?.value === "1";
  const adultConfirmed = cookies?.get("mn_adult_confirmed")?.value === "1";
  const adultMode = cookies?.get("mn_adult_mode")?.value === "1";

  if (requireLoginForAdult && !isSignedIn) {
    return { ok: false, reason: "NEED_LOGIN" };
  }
  if (!adultConfirmed) {
    return { ok: false, reason: "NEED_AGE_CONFIRM" };
  }
  if (!adultMode) {
    return { ok: false, reason: "NEED_ADULT_MODE" };
  }
  return { ok: true, reason: null };
}
