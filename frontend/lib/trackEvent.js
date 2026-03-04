let analyticsTrack = null;
let analyticsLoadPromise = null;

export function trackEvent(event, props = {}) {
  if (typeof window === "undefined") {
    return;
  }

  if (analyticsTrack) {
    analyticsTrack(event, props);
    return;
  }

  if (!analyticsLoadPromise) {
    analyticsLoadPromise = import("./analytics")
      .then((mod) => {
        if (typeof mod.track === "function") {
          analyticsTrack = mod.track;
        }
      })
      .catch(() => undefined)
      .finally(() => {
        analyticsLoadPromise = null;
      });
  }

  analyticsLoadPromise.then(() => {
    if (analyticsTrack) {
      analyticsTrack(event, props);
    }
  });
}
