export const PLAN_IDS = ["FREE", "STARTER", "GROWTH", "PRO"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanOverage {
  products: number;
  variants: number;
  price: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: number | null; // null => Free
  priceLabel: string;
  maxProducts: number | null; // null => unlimited
  maxVariants: number | null;
  maxFeeds: number | null;
  syncFrequencyHours: number;
  syncFrequencyLabel: string;
  supportLevel: string;
  trialDays?: number;
  multiMarket?: boolean;
  overage?: PlanOverage;
  features: string[];
  /** Highlighted as the suggested plan on the pricing page. */
  recommended?: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
    id: "FREE",
    name: "Free",
    price: null,
    priceLabel: "Free",
    maxProducts: 500,
    maxVariants: 500,
    maxFeeds: 1,
    syncFrequencyHours: 10,
    syncFrequencyLabel: "Automatic feed sync every 10 hours",
    supportLevel: "Email support",
    features: [
      "Up to 500 products",
      "Up to 500 variants",
      "1 feed",
      "Automatic feed sync every 10 hours",
      "Email support",
    ],
  },
  {
    id: "STARTER",
    name: "Starter",
    price: 1.99,
    priceLabel: "$1.99/month",
    maxProducts: 2000,
    maxVariants: 5000,
    maxFeeds: 5,
    syncFrequencyHours: 3,
    syncFrequencyLabel: "Automatic feed sync every 3 hours",
    supportLevel: "Priority email support",
    trialDays: 7,
    overage: { products: 100, variants: 200, price: 0.05 },
    features: [
      "Up to 2,000 products",
      "Up to 5,000 variants",
      "Up to 5 feeds",
      "Automatic feed sync every 3 hours",
      "Priority email support",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth",
    price: 3.49,
    priceLabel: "$3.49/month",
    maxProducts: 5000,
    maxVariants: 20000,
    maxFeeds: 10,
    syncFrequencyHours: 1,
    syncFrequencyLabel: "Automatic feed sync every 1 hour",
    supportLevel: "Priority email support",
    trialDays: 7,
    multiMarket: true,
    overage: { products: 100, variants: 200, price: 0.04 },
    recommended: true,
    features: [
      "Up to 5,000 products",
      "Up to 20,000 variants",
      "Up to 10 feeds",
      "Multi-market support",
      "Automatic feed sync every 1 hour",
      "Priority email support",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: 6.99,
    priceLabel: "$6.99/month",
    maxProducts: null,
    maxVariants: null,
    maxFeeds: null,
    syncFrequencyHours: 1,
    syncFrequencyLabel: "Automatic feed sync every 1 hour",
    supportLevel: "Priority support (email)",
    multiMarket: true,
    features: [
      "Unlimited products",
      "Unlimited variants",
      "Unlimited feeds",
      "Multi-market support",
      "Automatic feed sync every 1 hour",
      "Priority support (email)",
    ],
  },
];

export function getPlan(id: string): PlanDefinition | undefined {
  return PLANS.find((p) => p.id === id);
}

/** Shop.planName predates this catalog and free-form-defaults to
 * "mock-development" — anything that isn't a recognized plan id is treated
 * as Free rather than crashing the Plans page. */
export function resolvePlan(planName: string): PlanDefinition {
  return getPlan(planName) ?? DEFAULT_PLAN;
}

const DEFAULT_PLAN = PLANS[0]!;

export type UsageTone = "success" | "warning" | "critical";

/** 0–60% green, 60–85% orange, 85%+ red — Polaris's ProgressBar doesn't
 * have a warning/orange tone, so callers render their own bar using these
 * tones mapped to Polaris's fill-color tokens. */
export function usageTone(percent: number): UsageTone {
  if (percent >= 85) return "critical";
  if (percent >= 60) return "warning";
  return "success";
}

export function usagePercent(used: number, max: number | null): number {
  if (max === null || max === 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

/** Separate escalation ladder from the progress-bar color bands above —
 * these are the 80/90/100% checkpoints the spec calls out for warning text. */
export function usageWarning(percent: number, label: string): string | null {
  if (percent >= 100)
    return `You've reached your ${label.toLowerCase()} limit.`;
  if (percent >= 90)
    return `You're almost at your ${label.toLowerCase()} limit — ${percent}% used.`;
  if (percent >= 80)
    return `You're approaching your ${label.toLowerCase()} limit — ${percent}% used.`;
  return null;
}
