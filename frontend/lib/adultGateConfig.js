function readFlag(value, fallback = false) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export const requireLoginForAdult = readFlag(
  process.env.NEXT_PUBLIC_REQUIRE_LOGIN_FOR_ADULT,
  false,
);
