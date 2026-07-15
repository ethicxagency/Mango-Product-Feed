import { db } from "~/lib/db.server";

export const collectionRepository = {
  async listByShop(shopId: string) {
    return db.collection.findMany({
      where: { shopId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    });
  },
};
