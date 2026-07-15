import { db } from "~/lib/db.server";

export const tagRepository = {
  async listByShop(shopId: string) {
    return db.tag.findMany({
      where: { shopId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  },
};
