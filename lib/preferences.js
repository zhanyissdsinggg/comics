const preferencesByUser = new Map();

export function getPreference(userId) {
  if (!preferencesByUser.has(userId)) {
    preferencesByUser.set(userId, {
      notifyNewEpisode: true,
      notifyTtfReady: true,
      notifyPromo: true,
    });
  }
  return preferencesByUser.get(userId);
}

export function setPreference(userId, payload) {
  const base = getPreference(userId);
  const next = {
    ...base,
    ...payload,
  };
  preferencesByUser.set(userId, next);
  return next;
}
