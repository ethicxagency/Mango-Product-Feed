/**
 * Local dev and the existing Playwright/Vitest suites run without a real
 * Shopify session (no OAuth handshake, no App Bridge). This flag is the one
 * place that distinguishes "running against mock data with no Shopify
 * session" from "running as a real embedded app" — every other file that
 * needs to skip real authentication checks goes through this function
 * rather than reading the env var directly.
 *
 * Never true by default: it must be explicitly opted into via MOCK_SHOPIFY=true
 * in .env (local dev before Shopify credentials are wired up) or in the test
 * runner's environment (see playwright.config.ts).
 */
export function isMockModeEnabled(): boolean {
  return process.env.MOCK_SHOPIFY === "true";
}
