import { db } from "~/lib/db.server";

/**
 * Distinct filter facets (vendors, product types) used to populate the feed
 * targeting form. Kept separate from productRepository since these are
 * catalog-wide aggregates rather than per-product queries.
 */
export const catalogFacetsRepository = {
  async listVendors(shopId: string): Promise<string[]> {
    const rows = await db.product.findMany({
      where: { shopId, deletedAt: null, vendor: { not: "" } },
      distinct: ["vendor"],
      select: { vendor: true },
      orderBy: { vendor: "asc" },
    });
    return rows.map((r) => r.vendor);
  },

  async listProductTypes(shopId: string): Promise<string[]> {
    const rows = await db.product.findMany({
      where: { shopId, deletedAt: null, productType: { not: "" } },
      distinct: ["productType"],
      select: { productType: true },
      orderBy: { productType: "asc" },
    });
    return rows.map((r) => r.productType);
  },
};
