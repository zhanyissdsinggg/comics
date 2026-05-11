let analyticsTrack = null;
let analyticsTrackPageView = null;
let analyticsTrackConversion = null;
let analyticsPrimeProviders = null;
let analyticsLoadPromise = null;

function ensureAnalyticsLoaded() {
  if (analyticsLoadPromise) {
    return analyticsLoadPromise;
  }

  analyticsLoadPromise = import("./analytics")
    .then((mod) => {
      analyticsTrack =
        typeof mod.trackEvent === "function"
          ? mod.trackEvent
          : typeof mod.track === "function"
            ? mod.track
            : null;
      analyticsTrackPageView =
        typeof mod.trackPageView === "function" ? mod.trackPageView : null;
      analyticsTrackConversion =
        typeof mod.trackConversion === "function" ? mod.trackConversion : null;
      analyticsPrimeProviders =
        typeof mod.primeAnalyticsProviders === "function" ? mod.primeAnalyticsProviders : null;
    })
    .catch(() => undefined)
    .finally(() => {
      analyticsLoadPromise = null;
    });

  return analyticsLoadPromise;
}

export function trackEvent(event, props = {}) {
  if (typeof window === "undefined") {
    return;
  }

  if (analyticsTrack) {
    analyticsTrack(event, props);
    return;
  }

  ensureAnalyticsLoaded().then(() => {
    if (analyticsTrack) {
      analyticsTrack(event, props);
    }
  });
}

export function trackPageView(path, props = {}) {
  if (typeof window === "undefined") {
    return;
  }

  if (analyticsTrackPageView) {
    analyticsTrackPageView(path, props);
    return;
  }

  ensureAnalyticsLoaded().then(() => {
    if (analyticsTrackPageView) {
      analyticsTrackPageView(path, props);
    }
  });
}

export function trackConversion(event, props = {}) {
  if (typeof window === "undefined") {
    return;
  }

  if (analyticsTrackConversion) {
    analyticsTrackConversion(event, props);
    return;
  }

  ensureAnalyticsLoaded().then(() => {
    if (analyticsTrackConversion) {
      analyticsTrackConversion(event, props);
    } else if (analyticsTrack) {
      analyticsTrack(event, props);
    }
  });
}

export function primeAnalyticsProviders() {
  if (typeof window === "undefined") {
    return;
  }

  if (analyticsPrimeProviders) {
    analyticsPrimeProviders();
    return;
  }

  ensureAnalyticsLoaded().then(() => {
    if (analyticsPrimeProviders) {
      analyticsPrimeProviders();
    }
  });
}
