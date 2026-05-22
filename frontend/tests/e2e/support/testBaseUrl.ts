const configuredPort = Number(process.env.PLAYWRIGHT_PORT || 4173);

export const TEST_FRONTEND_PORT =
  Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 4173;

export const TEST_FRONTEND_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${TEST_FRONTEND_PORT}`;
