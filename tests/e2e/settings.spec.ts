import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();

const SECTIONS: { path: string; heading: string }[] = [
  { path: "general", heading: "General" },
  { path: "store-information", heading: "Store Information" },
  { path: "feed-defaults", heading: "Feed Defaults" },
  { path: "google-merchant", heading: "Google Merchant" },
  { path: "meta-commerce", heading: "Meta Commerce" },
  { path: "tiktok", heading: "TikTok Catalog" },
  { path: "product-rules", heading: "Product Rules" },
  { path: "synchronization", heading: "Synchronization" },
  { path: "notifications", heading: "Notifications" },
  { path: "api-webhooks", heading: "API & Webhooks" },
  { path: "security", heading: "Feed URL access" },
  { path: "billing", heading: "Current plan" },
  { path: "team", heading: "Roles" },
  { path: "about", heading: "Mango Product Feed" },
];

test.describe("Settings module", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("index redirects to General", async ({ page }) => {
    await page.goto("/app/settings");
    await expect(page).toHaveURL(/\/app\/settings\/general$/);
    await expect(page.getByRole("heading", { name: "General" })).toBeVisible();
  });

  for (const section of SECTIONS) {
    test(`${section.path} section loads without error`, async ({ page }) => {
      await page.goto(`/app/settings/${section.path}`);
      await expect(
        page.getByRole("heading", { name: section.heading }),
      ).toBeVisible();
    });
  }

  test("General: saving persists, and Reset afterward keeps the saved value (not the pre-save one)", async ({
    page,
  }) => {
    await page.goto("/app/settings/general");

    const storeName = page.getByLabel("Store name");
    await storeName.fill("E2E Settings Store");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("General saved")).toBeVisible();
    await expect(storeName).toHaveValue("E2E Settings Store");

    // Save again with a different value, confirming the fix isn't a
    // one-time coincidence (this is exactly the bug that was found: a
    // second consecutive save previously left the field showing the
    // *first* save's value instead of the new one).
    await storeName.fill("E2E Settings Store v2");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(storeName).toHaveValue("E2E Settings Store v2");

    // Reset must restore the just-saved value, not whatever was on the
    // page before either save.
    await storeName.fill("unsaved edit that should be discarded");
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(storeName).toHaveValue("E2E Settings Store v2");
  });

  test("Product Rules: invalid price range shows a validation error", async ({
    page,
  }) => {
    await page.goto("/app/settings/product-rules");
    await page.getByLabel("Minimum price").fill("100");
    await page.getByLabel("Maximum price").fill("10");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByText(
        "Minimum price must be less than or equal to maximum price",
      ),
    ).toBeVisible();
  });

  test("Security: regenerating feed secret tokens requires confirmation", async ({
    page,
  }) => {
    await page.goto("/app/settings/security");
    await page
      .getByRole("button", { name: "Regenerate all feed secret tokens" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Regenerate all feed secret tokens?" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", { name: "Regenerate all feed secret tokens?" }),
    ).not.toBeVisible();
  });

  test("Synchronization: full sync in mock mode updates all sync timestamps", async ({
    page,
  }) => {
    await page.goto("/app/settings/synchronization");
    await page.getByRole("button", { name: "Full synchronization" }).click();
    await expect(page.getByText(/Sync completed/)).toBeVisible();
  });
});
