import { expect, test } from "@playwright/test";

test("dashboard shows product and feed stats", async ({ page }) => {
  await page.goto("/app");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Total Products")).toBeVisible();
  await expect(page.getByText("Active Products")).toBeVisible();
  await expect(page.getByText("Draft Products")).toBeVisible();
  await expect(page.getByText("Archived Products")).toBeVisible();
  await expect(page.getByText("Feed Count")).toBeVisible();
  await expect(page.getByText("Latest Feed")).toBeVisible();
  await expect(page.getByText("Last Generated")).toBeVisible();
  await expect(page.getByText("Feed Status")).toBeVisible();
  await expect(page.getByText("Recent Activity")).toBeVisible();
});

test("root path redirects into the embedded app", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/app$/);
});
