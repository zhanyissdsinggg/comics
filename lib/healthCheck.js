import { apiGet } from "../lib/apiClient";

let lastStatus = null;
let lastCheckedAt = 0;

export async function checkBackendHealth() {
  const now = Date.now();
  if (now - lastCheckedAt < 10_000 && lastStatus) {
    return lastStatus;
  }
  lastCheckedAt = now;
  const response = await apiGet("/api/health", { cacheMs: 0, bust: true });
  lastStatus = response.ok ? { ok: true } : { ok: false, error: response.error };
  return lastStatus;
}
