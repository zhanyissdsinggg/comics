export function track(event, props = {}) {
  const payload = { event, ...props, timestamp: Date.now() };

  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, props);
    return;
  }

  if (typeof window !== "undefined" && window.mixpanel?.track) {
    window.mixpanel.track(event, props);
    return;
  }

  console.log("[track]", payload);
}
