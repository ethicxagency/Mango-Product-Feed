import type { Prisma } from "@prisma/client";

import { db } from "~/lib/db.server";

export const settingsWithRelationsInclude = {
  googleMerchant: true,
  metaCommerce: true,
  tiktok: true,
  productRules: true,
} satisfies Prisma.SettingsInclude;

export type SettingsWithRelations = Prisma.SettingsGetPayload<{
  include: typeof settingsWithRelationsInclude;
}>;

/** Every shop has exactly one Settings record — this is the only place
 * that creates one, lazily, the first time a shop's settings are read.
 * Child tables (googleMerchant/metaCommerce/tiktok/productRules) are
 * created alongside it so every section always has a row to update
 * in place rather than needing its own upsert-or-create branching. */
async function getOrCreate(shopId: string): Promise<SettingsWithRelations> {
  const existing = await db.settings.findUnique({
    where: { shopId },
    include: settingsWithRelationsInclude,
  });
  if (existing) return existing;

  return db.settings.create({
    data: {
      shopId,
      googleMerchant: { create: {} },
      metaCommerce: { create: {} },
      tiktok: { create: {} },
      productRules: { create: {} },
    },
    include: settingsWithRelationsInclude,
  });
}

export const settingsRepository = {
  getOrCreate,

  async updateGeneral(
    shopId: string,
    data: Prisma.SettingsUpdateInput,
  ): Promise<void> {
    const settings = await getOrCreate(shopId);
    await db.settings.update({ where: { id: settings.id }, data });
  },

  async updateFeedDefaults(
    shopId: string,
    data: Prisma.SettingsUpdateInput,
  ): Promise<void> {
    const settings = await getOrCreate(shopId);
    await db.settings.update({ where: { id: settings.id }, data });
  },

  async updateNotifications(
    shopId: string,
    data: Prisma.SettingsUpdateInput,
  ): Promise<void> {
    const settings = await getOrCreate(shopId);
    await db.settings.update({ where: { id: settings.id }, data });
  },

  async updateSecurity(
    shopId: string,
    data: Prisma.SettingsUpdateInput,
  ): Promise<void> {
    const settings = await getOrCreate(shopId);
    await db.settings.update({ where: { id: settings.id }, data });
  },

  /** null clears the expiry (restores public URL access); a Date sets the
   * moment from which no-token feed access starts being rejected. */
  async setPublicUrlsExpireAt(
    shopId: string,
    publicUrlsExpireAt: Date | null,
  ): Promise<void> {
    const settings = await getOrCreate(shopId);
    await db.settings.update({
      where: { id: settings.id },
      data: { publicUrlsExpireAt },
    });
  },

  async updateGoogleMerchant(
    shopId: string,
    data: Prisma.GoogleMerchantSettingsUpdateInput,
  ): Promise<void> {
    const settings = await getOrCreate(shopId);
    await db.googleMerchantSettings.update({
      where: { settingsId: settings.id },
      data,
    });
  },

  async updateMetaCommerce(
    shopId: string,
    data: Prisma.MetaCommerceSettingsUpdateInput,
  ): Promise<void> {
    const settings = await getOrCreate(shopId);
    await db.metaCommerceSettings.update({
      where: { settingsId: settings.id },
      data,
    });
  },

  async updateTikTok(
    shopId: string,
    data: Prisma.TikTokSettingsUpdateInput,
  ): Promise<void> {
    const settings = await getOrCreate(shopId);
    await db.tikTokSettings.update({
      where: { settingsId: settings.id },
      data,
    });
  },

  async updateProductRules(
    shopId: string,
    data: Prisma.ProductRulesSettingsUpdateInput,
  ): Promise<void> {
    const settings = await getOrCreate(shopId);
    await db.productRulesSettings.update({
      where: { settingsId: settings.id },
      data,
    });
  },

  /** Danger zone: deletes the shop's Settings row (cascading to every
   * child table) and immediately recreates it with defaults, inside a
   * transaction so the shop is never left without a settings record. */
  async resetAll(shopId: string): Promise<SettingsWithRelations> {
    return db.$transaction(async (tx) => {
      await tx.settings.deleteMany({ where: { shopId } });
      return tx.settings.create({
        data: {
          shopId,
          googleMerchant: { create: {} },
          metaCommerce: { create: {} },
          tiktok: { create: {} },
          productRules: { create: {} },
        },
        include: settingsWithRelationsInclude,
      });
    });
  },
};
