import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Dev/test data lives in SQLite (see prisma/schema.prisma), which only
  // allows one writer at a time. Running spec files in parallel workers
  // causes concurrent Prisma writes across files to hit "database is
  // locked" and intermittently fail feed create/update actions, so this
  // suite runs fully serial. Production targets Postgres, where this
  // constraint doesn't apply.
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
