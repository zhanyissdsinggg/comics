const GOOGLE_CLIENT_ID = (
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
).trim();

export function isGoogleAuthEnabled() {
  return GOOGLE_CLIENT_ID.length > 0;
}
