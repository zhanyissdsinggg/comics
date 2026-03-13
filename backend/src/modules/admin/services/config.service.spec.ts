import { ConfigService } from "./config.service";

describe("ConfigService", () => {
  const resetStaticState = () => {
    (ConfigService as any).configCache.clear();
    (ConfigService as any).configInflight.clear();
    (ConfigService as any).configVersions.clear();
  };

  beforeEach(() => {
    resetStaticState();
  });

  it("dedupes concurrent loads for the same config key", async () => {
    let resolveFindUnique: ((value: unknown) => void) | undefined;
    const prisma = {
      trackingConfig: {
        findUnique: jest.fn(
          () =>
            new Promise((resolve) => {
              resolveFindUnique = resolve;
            }),
        ),
        upsert: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const service = new ConfigService(prisma as any);

    const first = service.getConfig("tracking", { enabled: false });
    const second = service.getConfig("tracking", { enabled: false });

    expect(prisma.trackingConfig.findUnique).toHaveBeenCalledTimes(1);

    expect(resolveFindUnique).toBeDefined();
    resolveFindUnique!({
      key: "tracking",
      payload: JSON.stringify({ enabled: true }),
    });

    await expect(first).resolves.toEqual({ enabled: true });
    await expect(second).resolves.toEqual({ enabled: true });
  });

  it("does not let an older inflight read overwrite a newer saved config", async () => {
    let resolveFindUnique: ((value: unknown) => void) | undefined;
    const prisma = {
      trackingConfig: {
        findUnique: jest.fn(
          () =>
            new Promise((resolve) => {
              resolveFindUnique = resolve;
            }),
        ),
        upsert: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const service = new ConfigService(prisma as any);

    const pending = service.getConfig("tracking", { enabled: false });
    await service.setConfig("tracking", { enabled: true });

    expect(resolveFindUnique).toBeDefined();
    resolveFindUnique!({
      key: "tracking",
      payload: JSON.stringify({ enabled: false }),
    });

    await expect(pending).resolves.toEqual({ enabled: true });
    await expect(service.getConfig("tracking", { enabled: false })).resolves.toEqual({
      enabled: true,
    });
  });
});
