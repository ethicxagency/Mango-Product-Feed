import { db } from "~/lib/db.server";

export interface ProductStatusCounts {
  total: number;
  active: number;
  draft: number;
  archived: number;
}

export const productRepository = {
  async getStatusCounts(shopId: string): Promise<ProductStatusCounts> {
    const rows = await db.product.groupBy({
      by: ["status"],
      where: { shopId, deletedAt: null },
      _count: { _all: true },
    });

    const counts: ProductStatusCounts = {
      total: 0,
      active: 0,
      draft: 0,
      archived: 0,
    };

    for (const row of rows) {
      counts.total += row._count._all;
      if (row.status === "ACTIVE") counts.active = row._count._all;
      if (row.status === "DRAFT") counts.draft = row._count._all;
      if (row.status === "ARCHIVED") counts.archived = row._count._all;
    }

    return counts;
  },

  /** Lightweight lookup used to populate the manual product picker. */
  async search(shopId: string, query: string, limit = 50) {
    return db.product.findMany({
      where: {
        shopId,
        deletedAt: null,
        ...(query ? { title: { contains: query } } : {}),
      },
      orderBy: { title: "asc" },
      take: limit,
      select: { id: true, title: true, vendor: true, status: true },
    });
  },

  async findByIds(shopId: string, productIds: string[]) {
    if (productIds.length === 0) return [];
    return db.product.findMany({
      where: { shopId, id: { in: productIds } },
      select: { id: true, title: true, vendor: true, status: true },
    });
  },
};
