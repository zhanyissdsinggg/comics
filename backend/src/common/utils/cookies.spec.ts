import { buildCookieOptions } from "./cookies";

function createRequestContext(origin: string, host: string) {
  return {
    headers: { origin, host },
    get: ((name: string) => (name.toLowerCase() === "host" ? host : undefined)) as any,
  };
}

describe("buildCookieOptions", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("keeps same-site requests on lax cookies", () => {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SAMESITE;

    const options = buildCookieOptions(
      { httpOnly: true },
      createRequestContext("https://www.gushcomics.com", "api.gushcomics.com"),
    );

    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(true);
  });

  it("upgrades cross-site requests to SameSite=None", () => {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SAMESITE;

    const options = buildCookieOptions(
      { httpOnly: true },
      createRequestContext("https://www.gushcomics.com", "comics-production-07fa.up.railway.app"),
    );

    expect(options.sameSite).toBe("none");
    expect(options.secure).toBe(true);
  });

  it("respects explicit COOKIE_SAMESITE overrides", () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SAMESITE = "strict";

    const options = buildCookieOptions(
      { httpOnly: true },
      createRequestContext("https://www.gushcomics.com", "comics-production-07fa.up.railway.app"),
    );

    expect(options.sameSite).toBe("strict");
  });
});


