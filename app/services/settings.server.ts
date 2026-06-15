import prisma from "../db.server";
import {
  DEFAULT_SETTINGS,
  type AppSettingsMap,
} from "../types/feed";

const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettingsMap)[];

export async function getAppSettings(): Promise<AppSettingsMap> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: SETTINGS_KEYS } },
  });

  const settings: AppSettingsMap = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const key = row.key as keyof AppSettingsMap;
    switch (key) {
      case "storeName":
        settings.storeName = parseSettingValue(key, row.value);
        break;
      case "storeUrl":
        settings.storeUrl = parseSettingValue(key, row.value);
        break;
      case "requireSecretTokens":
        settings.requireSecretTokens = parseSettingValue(key, row.value);
        break;
      case "streamingBatchSize":
        settings.streamingBatchSize = parseSettingValue(key, row.value);
        break;
      case "maxFeedLogs":
        settings.maxFeedLogs = parseSettingValue(key, row.value);
        break;
      case "enableScheduler":
        settings.enableScheduler = parseSettingValue(key, row.value);
        break;
    }
  }

  return settings;
}

export async function updateAppSettings(
  updates: Partial<AppSettingsMap>,
): Promise<AppSettingsMap> {
  for (const [key, value] of Object.entries(updates)) {
    const settingKey = key as keyof AppSettingsMap;
    if (!(settingKey in DEFAULT_SETTINGS)) continue;

    await prisma.appSetting.upsert({
      where: { key: settingKey },
      create: {
        key: settingKey,
        value: serializeSettingValue(value),
      },
      update: {
        value: serializeSettingValue(value),
      },
    });
  }

  return getAppSettings();
}

function parseSettingValue<K extends keyof AppSettingsMap>(
  key: K,
  value: string,
): AppSettingsMap[K] {
  const defaultValue = DEFAULT_SETTINGS[key];
  if (typeof defaultValue === "boolean") {
    return (value === "true") as AppSettingsMap[K];
  }
  if (typeof defaultValue === "number") {
    const parsed = Number.parseInt(value, 10);
    return (Number.isNaN(parsed) ? defaultValue : parsed) as AppSettingsMap[K];
  }
  return value as AppSettingsMap[K];
}

function serializeSettingValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export async function seedDefaultSettings(): Promise<void> {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: serializeSettingValue(value) },
      update: {},
    });
  }
}
