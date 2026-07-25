import type { Prisma } from "@prisma/client";

import { db } from "~/lib/db.server";

export const feedProductInclude = {
  variants: true,
  images: true,
  metafields: true,
} satisfies Prisma.ProductInclude;

export type FeedProductRow = Prisma.ProductGetPayload<{
  include: typeof feedProductInclude;
}>;

const DEFAULT_BATCH_SIZE = 200;

export const feedProductRepository = {
  /**
   * Cursor-paginated stream over the candidate product set. Keeps memory
   * bounded to one batch at a time regardless of catalog size (100k+
   * products), and avoids the N+1 query pattern by including variants and
   * images in the same query as the page fetch.
   */
  async *stream(
    where: Prisma.ProductWhereInput,
    batchSize: number = DEFAULT_BATCH_SIZE,
  ): AsyncGenerator<FeedProductRow[]> {
    let cursor: string | undefined;

    while (true) {
      const page = await db.product.findMany({
        where,
        include: feedProductInclude,
        orderBy: { id: "asc" },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (page.length === 0) return;

      yield page;

      if (page.length < batchSize) return;
      cursor = page[page.length - 1]!.id;
    }
  },
};
