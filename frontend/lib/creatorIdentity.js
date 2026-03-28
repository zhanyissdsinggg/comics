import { buildCreatorHref, normalizeCreatorName, slugifyCreatorName } from "./creators";

const TEAM_TOKENS = ["studio", "team", "works", "lab", "labs", "collective", "house", "project"];

export const CREATOR_FALLBACK_LABEL = "Creator details coming soon";
export const CREATOR_FALLBACK_DETAIL = "Public creator names have not been listed on this title yet.";

export function inferCreatorCreditType(name) {
  const normalized = normalizeCreatorName(name).toLowerCase();
  if (!normalized) {
    return "fallback";
  }

  return TEAM_TOKENS.some((token) => normalized.includes(token)) ? "team" : "creator";
}

export function resolveCreatorIdentity(name) {
  const normalizedName = normalizeCreatorName(name);
  if (!normalizedName) {
    return {
      hasPublicCredit: false,
      name: "",
      displayName: CREATOR_FALLBACK_LABEL,
      value: CREATOR_FALLBACK_LABEL,
      slug: "",
      href: "",
      creditType: "fallback",
      eyebrow: "Story credits",
      detail: CREATOR_FALLBACK_DETAIL,
    };
  }

  const slug = slugifyCreatorName(normalizedName);

  return {
    hasPublicCredit: true,
    name: normalizedName,
    displayName: normalizedName,
    value: normalizedName,
    slug,
    href: slug ? buildCreatorHref(normalizedName) : "",
    creditType: inferCreatorCreditType(normalizedName),
    eyebrow: normalizedName,
    detail: "View Creator",
  };
}
