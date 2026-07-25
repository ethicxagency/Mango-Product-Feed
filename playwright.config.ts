import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Every spec file shares the single mock shop's catalog (see
  // getCurrentShop's mock-mode fallback), not a per-worker-isolated one —
  // running spec files in parallel workers would let concurrent tests
  // mutate the same products/collections out from under each other, so
  // this suite runs fully serial regardless of database engine.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    // Forced regardless of .env: e2e tests never have a real Shopify
    // session, so they must always run against the mock-mode shop lookup.
    env: { MOCK_SHOPIFY: "true" },
  },
});
