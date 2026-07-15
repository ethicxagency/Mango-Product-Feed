import type { WeightUnit } from "~/types/product";

export const VENDORS = [
  "Nordwood Supply Co.",
  "Lumen & Co",
  "Basecamp Outdoors",
  "Aurelia Beauty",
  "Ferro Kitchenware",
  "Trailhead Gear",
  "Wintermute Audio",
  "Cascade Cycles",
  "Marrow Home",
  "Solstice Apparel",
  "Nimbus Tech",
  "Harbor & Vine",
] as const;

export const PRODUCT_TYPES = [
  "Apparel",
  "Footwear",
  "Electronics",
  "Home & Kitchen",
  "Beauty",
  "Outdoor & Sporting Goods",
  "Accessories",
  "Toys & Games",
  "Health & Wellness",
  "Pet Supplies",
] as const;

export const TAG_POOL = [
  "bestseller",
  "new-arrival",
  "limited-edition",
  "eco-friendly",
  "sale",
  "organic",
  "handmade",
  "waterproof",
  "wireless",
  "vegan",
  "unisex",
  "summer-2026",
  "winter-collection",
  "gift-idea",
  "clearance",
  "premium",
  "everyday-essential",
  "made-in-usa",
  "recycled-materials",
  "travel-friendly",
  "kids",
  "outdoor",
  "indoor",
  "small-batch",
  "restock",
  "customer-favorite",
  "back-in-stock",
  "low-stock",
  "high-performance",
  "lightweight",
] as const;

export const COLLECTION_DEFS = [
  { title: "New Arrivals", isSmart: true },
  { title: "Best Sellers", isSmart: true },
  { title: "Summer Collection", isSmart: false },
  { title: "Winter Essentials", isSmart: false },
  { title: "Clearance", isSmart: true },
  { title: "Eco-Friendly Picks", isSmart: false },
  { title: "Gift Guide", isSmart: false },
  { title: "Under $50", isSmart: true },
  { title: "Staff Picks", isSmart: false },
  { title: "Outdoor Adventure", isSmart: false },
  { title: "Home Refresh", isSmart: false },
  { title: "Tech Essentials", isSmart: false },
] as const;

export const WEIGHT_UNIT_CYCLE: WeightUnit[] = ["g", "kg", "oz", "lb"];

export const COLOR_OPTIONS = [
  "Black",
  "White",
  "Navy",
  "Charcoal",
  "Olive",
  "Sand",
  "Rust",
  "Sage",
  "Ivory",
  "Slate",
];

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

export const MATERIAL_OPTIONS = [
  "Cotton",
  "Recycled Polyester",
  "Stainless Steel",
  "Bamboo",
  "Leather",
  "Aluminum",
];

export const STORAGE_OPTIONS = ["32GB", "64GB", "128GB", "256GB", "512GB"];
