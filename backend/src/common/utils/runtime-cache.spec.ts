import { ExpiringValueCache } from "./runtime-cache";

describe("ExpiringValueCache", () => {
  it("dedupes concurrent loads for the same empty cache", async () => {
    const cache = new ExpiringValueCache<string>(1_000);
    let resolveLoader: ((value: string) => void) | undefined;
    const loader = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve;
        }),
    );

    const first = cache.getOrLoad(loader);
    const second = cache.getOrLoad(loader);

    expect(loader).toHaveBeenCalledTimes(1);

    expect(resolveLoader).toBeDefined();
    resolveLoader!("cached-value");

    await expect(first).resolves.toBe("cached-value");
    await expect(second).resolves.toBe("cached-value");
    expect(cache.get()).toBe("cached-value");
  });

  it("does not let an older inflight load overwrite a newer manual value", async () => {
    const cache = new ExpiringValueCache<string>(1_000);
    let resolveLoader: ((value: string) => void) | undefined;

    const pending = cache.getOrLoad(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve;
        }),
    );

    cache.set("fresh-value");
    expect(resolveLoader).toBeDefined();
    resolveLoader!("stale-value");

    await expect(pending).resolves.toBe("fresh-value");
    expect(cache.get()).toBe("fresh-value");
  });
});
