import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();

// Matches a real feed id segment but not the static "new" route.
const FEED_EDIT_URL = /\/app\/feeds\/(?!new$)[a-z0-9]+$/;

test.describe.serial("feed management CRUD", () => {
  test.beforeEach(async () => {
    // Previous failed runs can leave test feeds behind; start from a clean
    // slate so locators in this spec resolve to exactly one match.
    await prisma.feed.deleteMany({
      where: { name: { contains: "E2E Test Feed" } },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("create, edit, duplicate, toggle, and delete a feed", async ({
    page,
  }) => {
    await page.goto("/app/feeds");
    await page.getByRole("link", { name: "Create feed" }).first().click();

    await expect(
      page.getByRole("heading", { name: "Create feed" }),
    ).toBeVisible();
    await page.locator('input[name="name"]').fill("E2E Test Feed");
    await page.getByRole("button", { name: "Create feed" }).click();

    await expect(page).toHaveURL(FEED_EDIT_URL, { timeout: 20_000 });
    const feedUrl = page.url();
    await expect(
      page.getByRole("heading", { name: "E2E Test Feed" }),
    ).toBeVisible();
    await expect(page.getByText(/\/feeds\/.*\.xml$/)).toBeVisible();

    // Edit + save
    await page.getByLabel("Feed name").fill("E2E Test Feed (edited)");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Feed saved.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "E2E Test Feed (edited)" }),
    ).toBeVisible();

    // Toggle disable/enable
    await page.getByRole("button", { name: "Disable feed" }).click();
    await expect(page.getByText("DISABLED")).toBeVisible();
    await page.getByRole("button", { name: "Enable feed" }).click();
    await expect(page.getByText("ENABLED")).toBeVisible();

    // Duplicate — Polaris collapses secondary page actions into a "More
    // actions" menu when the header doesn't have room to show them inline.
    await page.getByRole("button", { name: "More actions" }).first().click();
    await page.getByRole("button", { name: "Duplicate", exact: true }).click();
    await expect(page).toHaveURL(FEED_EDIT_URL);
    await expect(
      page.getByRole("heading", { name: "E2E Test Feed (edited) (copy)" }),
    ).toBeVisible();

    // Delete the duplicate — navigation back to the list confirms success
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "More actions" }).first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/feeds$/);
    await expect(page.getByRole("heading", { name: "Feeds" })).toBeVisible();
    await expect(page.getByText("E2E Test Feed (edited) (copy)")).toHaveCount(
      0,
    );

    // Clean up the original by navigating straight back to its known URL
    await page.goto(feedUrl);
    await expect(
      page.getByRole("heading", { name: "E2E Test Feed (edited)" }),
    ).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "More actions" }).first().click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/feeds$/);
  });
});
