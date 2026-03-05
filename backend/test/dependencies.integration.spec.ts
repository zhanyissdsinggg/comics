import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { Client as PgClient } from "pg";

const runIntegration = process.env.INTEGRATION_TESTS === "1";
const describeIf = runIntegration ? describe : describe.skip;

describeIf("External dependencies integration", () => {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  let pgClient: PgClient;
  let redisClient: Redis;
  let prisma: PrismaClient;

  beforeAll(async () => {
    if (!databaseUrl || !redisUrl) {
      throw new Error("DATABASE_URL and REDIS_URL are required for integration tests");
    }

    pgClient = new PgClient({ connectionString: databaseUrl });
    await pgClient.connect();

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await redisClient.connect();

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  });

  afterAll(async () => {
    await Promise.allSettled([
      pgClient?.end(),
      redisClient?.quit(),
      prisma?.$disconnect(),
    ]);
  });

  it("postgres should answer SELECT 1", async () => {
    const result = await pgClient.query("SELECT 1 AS ok");
    expect(result.rows[0]?.ok).toBe(1);
  });

  it("prisma should execute raw query", async () => {
    const result = (await prisma.$queryRawUnsafe("SELECT 1 AS ok")) as Array<{
      ok: number;
    }>;
    expect(result[0]?.ok).toBe(1);
  });

  it("redis should respond to ping", async () => {
    const pong = await redisClient.ping();
    expect(pong).toBe("PONG");
  });
});