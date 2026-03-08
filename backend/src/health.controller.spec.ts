import { HealthController } from "./health.controller";

describe("HealthController", () => {
  const prismaMock = {
    $queryRaw: jest.fn(),
    paymentRetry: {
      count: jest.fn(),
    },
    order: {
      count: jest.fn(),
    },
  };

  let controller: HealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$queryRaw.mockResolvedValue([{ ok: 1 }]);
    prismaMock.paymentRetry.count.mockResolvedValue(2);
    prismaMock.order.count.mockResolvedValue(3);
    controller = new HealthController(prismaMock as any);
  });

  it("detail should return dbOk=true when query succeeds", async () => {
    const result = await controller.detail();

    expect(result.ok).toBe(true);
    expect(result.dbOk).toBe(true);
    expect(result.pendingOrders).toBe(3);
    expect(result.retryPending).toBe(2);
  });

  it("detail should degrade gracefully when db query fails", async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error("db down"));
    prismaMock.paymentRetry.count.mockResolvedValue(5);
    prismaMock.order.count.mockResolvedValue(7);

    const result = await controller.detail();

    expect(result.ok).toBe(false);
    expect(result.dbOk).toBe(false);
    expect(result.pendingOrders).toBe(7);
    expect(result.retryPending).toBe(5);
  });

  it("ready should degrade gracefully when db query fails", async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error("db down"));

    const result = await controller.ready();

    expect(result.ok).toBe(false);
    expect(result.dbOk).toBe(false);
    expect(result.memoryMB.rss).toBeGreaterThan(0);
    expect(result.memoryMB.heapUsed).toBeGreaterThan(0);
  });
});
