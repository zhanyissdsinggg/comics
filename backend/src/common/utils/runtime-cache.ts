type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

function getNextExpiry(ttlMs: number) {
  return Date.now() + Math.max(1, ttlMs);
}

export class ExpiringValueCache<T> {
  private entry: CacheEntry<T> | null = null;
  private inflight: Promise<T> | null = null;
  private version = 0;

  constructor(private readonly ttlMs: number) {}

  get(): T | null {
    if (!this.entry) {
      return null;
    }

    if (this.entry.expiresAt <= Date.now()) {
      this.entry = null;
      return null;
    }

    return this.entry.value;
  }

  set(value: T, ttlMs = this.ttlMs): T {
    this.version += 1;
    this.inflight = null;
    this.entry = {
      value,
      expiresAt: getNextExpiry(ttlMs),
    };
    return value;
  }

  clear(): void {
    this.version += 1;
    this.inflight = null;
    this.entry = null;
  }

  async getOrLoad(loader: () => Promise<T>): Promise<T> {
    const cached = this.get();
    if (cached !== null) {
      return cached;
    }

    if (this.inflight) {
      return this.inflight;
    }

    const loadVersion = this.version;
    const request = loader()
      .then((value) => {
        if (this.version !== loadVersion) {
          const nextCached = this.get();
          return nextCached !== null ? nextCached : value;
        }
        return this.set(value);
      })
      .finally(() => {
        if (this.inflight === request) {
          this.inflight = null;
        }
      });

    this.inflight = request;
    return request;
  }
}

export class ExpiringMapCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
  ) {}

  get(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.ttlMs): T {
    this.pruneExpired();
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.entries.set(key, {
      value,
      expiresAt: getNextExpiry(ttlMs),
    });

    return value;
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  private pruneExpired(now = Date.now()): void {
    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }

  private evictOldest(): void {
    const oldestKey = this.entries.keys().next().value;
    if (oldestKey !== undefined) {
      this.entries.delete(oldestKey);
    }
  }
}
