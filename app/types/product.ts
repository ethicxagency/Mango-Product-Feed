export const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const INVENTORY_POLICIES = ["DENY", "CONTINUE"] as const;
export type InventoryPolicy = (typeof INVENTORY_POLICIES)[number];

export const INVENTORY_MANAGEMENT_TYPES = ["SHOPIFY", "NOT_MANAGED"] as const;
export type InventoryManagement = (typeof INVENTORY_MANAGEMENT_TYPES)[number];

export const WEIGHT_UNITS = ["g", "kg", "oz", "lb"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const AVAILABILITIES = [
  "in stock",
  "out of stock",
  "preorder",
  "backorder",
] as const;
export type Availability = (typeof AVAILABILITIES)[number];
