import { resetAppConfigForTests, loadAndValidateAppConfig } from "../src/common/config/app-config";

describe("Runtime config integration", () => {
  beforeEach(() => {
    resetAppConfigForTests();
  });

  it("builds a valid runtime config from minimum required env", () => {
    const config = loadAndValidateAppConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/gush_test",
      PORT: "4000",
      FRONTEND_ORIGIN: "http://localhost:3000",
      JWT_SECRET: "test-jwt-secret-keep-it-long-enough-for-validation",
      ADMIN_KEY: "TestAdminKey123!Secure",
      REDIS_URL: "redis://127.0.0.1:6379",
      ENABLE_ADMIN_RUNTIME: "1",
      ENABLE_COMMERCIAL_RUNTIME: "1",
      ENABLE_OPS_RUNTIME: "1",
    });

    expect(config.environment).toBe("test");
    expect(config.server.port).toBe(4000);
    expect(config.server.frontendOrigins).toEqual(["http://localhost:3000"]);
    expect(config.auth.jwtSecret.length).toBeGreaterThanOrEqual(32);
    expect(config.admin.keys).toContain("TestAdminKey123!Secure");
    expect(config.runtime.adminEnabled).toBe(true);
    expect(config.runtime.commercialEnabled).toBe(true);
    expect(config.runtime.opsEnabled).toBe(true);
  });
});
