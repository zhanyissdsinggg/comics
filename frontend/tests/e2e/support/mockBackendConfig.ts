export const TEST_BACKEND_PORT = Number(
  process.env.PLAYWRIGHT_API_MOCK_PORT || 4100,
);

export const TEST_BACKEND_BASE_URL = `http://127.0.0.1:${TEST_BACKEND_PORT}`;
