import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.fn();
const update = vi.fn();
const syncProducts = vi.fn();
const syncCollections = vi.fn();

vi.mock("~/lib/db.server", () => ({
  db: { shop: { updateMany, update } },
}));
vi.mock("~/services/shopify/product-sync.service.server", () => ({
  productSyncService: { syncAll: syncProducts },
}));
vi.mock("~/services/shopify/collection-sync.service.server", () => ({
  collectionSyncService: { syncAll: syncCollections },
}));

const admin = {} as never;

async function load() {
  return import("~/services/shopify/initial-sync.server");
}

beforeEach(() => {
  vi.resetAllMocks();
  update.mockResolvedValue({});
});

describe("catalog sync claiming (duplicate-job prevention)", () => {
  it("claims the sync when no sync is running", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    const { claimCatalogSync } = await load();
    expect(await claimCatalogSync("shop1")).toBe(true);
    // NULL status, non-RUNNING status, and stale RUNNING are all claimable.
    const where = updateMany.mock.calls[0]![0].where;
    expect(where.OR).toHaveLength(3);
  });

  it("refuses to claim when a fresh sync is already RUNNING", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    const { claimCatalogSync } = await load();
    expect(await claimCatalogSync("shop1")).toBe(false);
  });

  it("startCatalogSync does not start a second job", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    const { startCatalogSync } = await load();
    expect(await startCatalogSync("shop1", admin)).toBe("already-running");
    expect(syncProducts).not.toHaveBeenCalled();
  });
});

describe("runCatalogSync", () => {
  it("records SUCCESS after products and collections sync", async () => {
    syncProducts.mockResolvedValue(undefined);
    syncCollections.mockResolvedValue(undefined);
    const { runCatalogSync } = await load();
    await runCatalogSync("shop1", admin);
    expect(update).toHaveBeenCalledWith({
      where: { id: "shop1" },
      data: { lastSyncStatus: "SUCCESS", lastSyncError: null },
    });
  });

  it("records FAILED (and never throws) when the sync errors, so it can be retried", async () => {
    syncProducts.mockRejectedValue(new Error("Shopify API 429"));
    const { runCatalogSync } = await load();
    await expect(runCatalogSync("shop1", admin)).resolves.toBeUndefined();
    expect(syncCollections).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "shop1" },
      data: { lastSyncStatus: "FAILED", lastSyncError: "Shopify API 429" },
    });
  });

  it("startCatalogSync returns before the (slow) sync finishes", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    let release!: () => void;
    syncProducts.mockReturnValue(new Promise<void>((r) => (release = r)));
    const { startCatalogSync } = await load();

    const result = await startCatalogSync("shop1", admin);
    expect(result).toBe("started");
    // sync is still in flight, yet the caller (afterAuth) already resumed.
    expect(update).not.toHaveBeenCalled();
    release();
  });
});
