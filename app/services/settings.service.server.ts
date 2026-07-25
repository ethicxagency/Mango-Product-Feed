import {
  settingsRepository,
  type SettingsWithRelations,
} from "~/repositories/settings.repository.server";
import type {
  FeedDefaultsSettingsInput,
  GeneralSettingsInput,
  GoogleMerchantSettingsInput,
  MetaCommerceSettingsInput,
  NotificationsSettingsInput,
  ProductRulesSettingsInput,
  SecuritySettingsInput,
  TikTokSettingsInput,
} from "~/types/settings-form";

export const settingsService = {
  async getSettings(shopId: string): Promise<SettingsWithRelations> {
    return settingsRepository.getOrCreate(shopId);
  },

  async updateGeneral(shopId: string, input: GeneralSettingsInput) {
    await settingsRepository.updateGeneral(shopId, input);
  },

  async updateFeedDefaults(shopId: string, input: FeedDefaultsSettingsInput) {
    await settingsRepository.updateFeedDefaults(shopId, input);
  },

  async updateGoogleMerchant(
    shopId: string,
    input: GoogleMerchantSettingsInput,
  ) {
    await settingsRepository.updateGoogleMerchant(shopId, input);
  },

  async updateMetaCommerce(shopId: string, input: MetaCommerceSettingsInput) {
    await settingsRepository.updateMetaCommerce(shopId, input);
  },

  async updateTikTok(shopId: string, input: TikTokSettingsInput) {
    await settingsRepository.updateTikTok(shopId, input);
  },

  async updateProductRules(shopId: string, input: ProductRulesSettingsInput) {
    await settingsRepository.updateProductRules(shopId, input);
  },

  async updateNotifications(shopId: string, input: NotificationsSettingsInput) {
    await settingsRepository.updateNotifications(shopId, input);
  },

  async updateSecurity(shopId: string, input: SecuritySettingsInput) {
    await settingsRepository.updateSecurity(shopId, input);
  },

  async setPublicUrlsExpireAt(shopId: string, expireAt: Date | null) {
    await settingsRepository.setPublicUrlsExpireAt(shopId, expireAt);
  },

  async resetAll(shopId: string): Promise<SettingsWithRelations> {
    return settingsRepository.resetAll(shopId);
  },
};
