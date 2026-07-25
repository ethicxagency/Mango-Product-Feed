import { describe, expect, it } from "vitest";

import {
  feedDefaultsSettingsSchema,
  generalSettingsSchema,
  googleMerchantSettingsSchema,
  metaCommerceSettingsSchema,
  notificationsSettingsSchema,
  productRulesSettingsSchema,
  securitySettingsSchema,
  tiktokSettingsSchema,
} from "~/types/settings-form";

describe("generalSettingsSchema", () => {
  it("applies defaults for an empty submission", () => {
    const result = generalSettingsSchema.parse({});
    expect(result).toEqual({
      storeName: "",
      companyName: "",
      supportEmail: "",
      timezone: "America/New_York",
      defaultLanguage: "en",
      defaultCurrency: "USD",
      country: "US",
      dateFormat: "MM/DD/YYYY",
    });
  });

  it("rejects an invalid email but accepts an empty one", () => {
    expect(
      generalSettingsSchema.safeParse({ supportEmail: "not-an-email" }).success,
    ).toBe(false);
    expect(generalSettingsSchema.safeParse({ supportEmail: "" }).success).toBe(
      true,
    );
    expect(
      generalSettingsSchema.parse({ supportEmail: "a@b.com" }).supportEmail,
    ).toBe("a@b.com");
  });
});

describe("feedDefaultsSettingsSchema", () => {
  it("treats an absent checkbox field as false and a present one as true", () => {
    const result = feedDefaultsSettingsSchema.parse({
      feedIncludeOutOfStock: "true",
    });
    expect(result.feedIncludeOutOfStock).toBe(true);
    expect(result.feedIncludeVariants).toBe(true); // default(true), absent from input
  });

  it("parses an optional integer product limit, allowing empty", () => {
    expect(
      feedDefaultsSettingsSchema.parse({ feedDefaultProductLimit: "500" })
        .feedDefaultProductLimit,
    ).toBe(500);
    expect(
      feedDefaultsSettingsSchema.parse({}).feedDefaultProductLimit,
    ).toBeNull();
    expect(
      feedDefaultsSettingsSchema.safeParse({ feedDefaultProductLimit: "12.5" })
        .success,
    ).toBe(false);
  });
});

describe("googleMerchantSettingsSchema", () => {
  it("defaults condition to new and accepts a shipping price", () => {
    const result = googleMerchantSettingsSchema.parse({
      shippingPrice: "4.99",
    });
    expect(result.defaultCondition).toBe("new");
    expect(result.shippingPrice).toBe(4.99);
  });

  it("rejects an invalid condition value", () => {
    expect(
      googleMerchantSettingsSchema.safeParse({ defaultCondition: "broken" })
        .success,
    ).toBe(false);
  });
});

describe("metaCommerceSettingsSchema", () => {
  it("defaults inventory policy and catalog type", () => {
    const result = metaCommerceSettingsSchema.parse({});
    expect(result.inventoryPolicy).toBe("DENY");
    expect(result.facebookCatalogType).toBe("commerce");
  });
});

describe("tiktokSettingsSchema", () => {
  it("parses a full submission", () => {
    const result = tiktokSettingsSchema.parse({
      defaultBrand: "Acme",
      condition: "used",
      inventoryPolicy: "CONTINUE",
      defaultProductCategory: "Apparel",
    });
    expect(result).toEqual({
      defaultBrand: "Acme",
      condition: "used",
      inventoryPolicy: "CONTINUE",
      defaultProductCategory: "Apparel",
    });
  });
});

describe("productRulesSettingsSchema", () => {
  it("enforces minPrice <= maxPrice", () => {
    const result = productRulesSettingsSchema.safeParse({
      minPrice: "50",
      maxPrice: "10",
    });
    expect(result.success).toBe(false);
  });

  it("allows a valid price range and null bounds", () => {
    expect(
      productRulesSettingsSchema.safeParse({ minPrice: "10", maxPrice: "50" })
        .success,
    ).toBe(true);
    expect(productRulesSettingsSchema.safeParse({}).success).toBe(true);
  });
});

describe("notificationsSettingsSchema", () => {
  it("defaults failure/error notifications on and the weekly report off", () => {
    const result = notificationsSettingsSchema.parse({});
    expect(result.notifyFeedGenerationFailed).toBe(true);
    expect(result.notifySynchronizationFailed).toBe(true);
    expect(result.notifyWebhookErrors).toBe(true);
    expect(result.notifyWeeklyFeedReport).toBe(false);
  });
});

describe("securitySettingsSchema", () => {
  it("defaults requireSecretTokenGlobally to false", () => {
    expect(securitySettingsSchema.parse({}).requireSecretTokenGlobally).toBe(
      false,
    );
    expect(
      securitySettingsSchema.parse({ requireSecretTokenGlobally: "true" })
        .requireSecretTokenGlobally,
    ).toBe(true);
  });
});
