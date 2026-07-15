import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();

async function createTestFeed() {
  const shop = await prisma.shop.findFirstOrThrow();
  return prisma.feed.create({
    data: {
      shopId: shop.id,
      name: "E2E Generation Test Feed",
      channel: "GOOGLE",
      currency: shop.currency,
      rule: { create: {} },
    },
  });
}

test.describe.serial("feed generation, preview, and history", () => {
  test.beforeEach(async () => {
    await prisma.feed.deleteMany({
      where: { name: "E2E Generation Test Feed" },
    });
  });

  test.afterAll(async () => {
    await prisma.feed.deleteMany({
      where: { name: "E2E Generation Test Feed" },
    });
    await prisma.$disconnect();
  });

  test("generating a feed records history and updates the status banner", async ({
    page,
  }) => {
    const feed = await createTestFeed();
    await page.goto(`/app/feeds/${feed.id}`);

    await expect(page.getByText("No generation runs yet")).toBeVisible();

    await page.getByRole("button", { name: "Generate feed" }).click();

    await expect(page.getByText(/Generation (success|partial)/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Feed history")).toBeVisible();
    await expect(page.getByText(/products, .* variants/).first()).toBeVisible();
  });

  test("previewing a feed shows real XML without writing to history", async ({
    page,
  }) => {
    const feed = await createTestFeed();
    await page.goto(`/app/feeds/${feed.id}`);

    await page.getByRole("button", { name: "Preview feed" }).click();

    await expect(page.getByText(/Preview \(first \d+ items?/)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("pre")).toContainText("<?xml version");
    await expect(page.locator("pre")).toContainText("<g:id>");

    // Preview must not create a history entry.
    await expect(page.getByText("No generation runs yet")).toBeVisible();
  });

  test("downloading a feed sets Content-Disposition and logs a download", async ({
    page,
    request,
  }) => {
    const feed = await createTestFeed();
    await page.goto(`/app/feeds/${feed.id}`);

    const downloadLink = page.getByRole("link", { name: "Download XML" });
    const href = await downloadLink.getAttribute("href");
    expect(href).toContain("download=1");

    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toContain("attachment");

    const downloads = await prisma.feedDownload.findMany({
      where: { feedId: feed.id },
    });
    expect(downloads.length).toBeGreaterThan(0);
    expect(downloads[0]!.source).toBe("PRIVATE_URL");
  });
});
