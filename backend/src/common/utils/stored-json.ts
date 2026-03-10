export function parseStoredJson<T>(value: string | null | undefined, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as T | null;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function stringifyStoredJson(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value ?? {});
}
