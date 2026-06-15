import type { SubscriptionPlan } from "@prisma/client";
import prisma from "../db.server";

export const BILLING_PLANS: Record<
  SubscriptionPlan,
  {
    name: string;
    price: number;
    trialDays: number;
    description: string;
    features: string[];
  }
> = {
  FREE: {
    name: "Free Plan",
    price: 0,
    trialDays: 0,
    description: "Basic feed generation for small catalogs",
    features: ["3 feed types", "Manual sync", "Basic analytics"],
  },
  STARTER: {
    name: "Starter Plan",
    price: 9.99,
    trialDays: 7,
    description: "Automated sync and advanced feed rules",
    features: ["Automatic sync", "Feed rules engine", "Feed logs"],
  },
  PRO: {
    name: "Pro Plan",
    price: 29.99,
    trialDays: 7,
    description: "Full feed automation for growing merchants",
    features: [
      "All Starter features",
      "Multiple custom feeds",
      "Priority streaming feeds",
      "Advanced health dashboard",
    ],
  },
};

export async function getActiveSubscription(shopId: string) {
  return prisma.subscription.findFirst({
    where: { shopId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

export async function activateFreePlan(shopId: string) {
  await prisma.subscription.updateMany({
    where: { shopId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  return prisma.subscription.create({
    data: {
      shopId,
      plan: "FREE",
      status: "ACTIVE",
      price: 0,
    },
  });
}

export async function createPaidPlanRequest(
  shopId: string,
  plan: Exclude<SubscriptionPlan, "FREE">,
  confirmationUrl: string,
  chargeId: string,
) {
  await prisma.subscription.updateMany({
    where: { shopId, status: { in: ["ACTIVE", "PENDING"] } },
    data: { status: "CANCELLED" },
  });

  const config = BILLING_PLANS[plan];

  return prisma.subscription.create({
    data: {
      shopId,
      plan,
      status: "PENDING",
      price: config.price,
      trialDays: config.trialDays,
      shopifyChargeUrl: confirmationUrl,
      shopifyChargeId: chargeId,
    },
  });
}

export async function activatePaidPlan(shopId: string, chargeId: string) {
  const pending = await prisma.subscription.findFirst({
    where: {
      shopId,
      shopifyChargeId: chargeId,
      status: "PENDING",
    },
  });

  if (!pending) return null;

  await prisma.subscription.updateMany({
    where: { shopId, status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  const active = await prisma.subscription.update({
    where: { id: pending.id },
    data: { status: "ACTIVE" },
  });

  await prisma.shop.update({
    where: { id: shopId },
    data: { plan: pending.plan },
  });

  return active;
}

export async function createShopifySubscription(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  shopId: string,
  plan: Exclude<SubscriptionPlan, "FREE">,
  returnUrl: string,
) {
  const config = BILLING_PLANS[plan];

  const response = await admin.graphql(
    `#graphql
      mutation AppSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int, $test: Boolean) {
        appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, trialDays: $trialDays, test: $test) {
          appSubscription {
            id
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        name: config.name,
        returnUrl,
        trialDays: config.trialDays,
        test: process.env.NODE_ENV !== "production",
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: config.price, currencyCode: "USD" },
                interval: "EVERY_30_DAYS",
              },
            },
          },
        ],
      },
    },
  );

  const payload = await response.json();
  const result = payload.data?.appSubscriptionCreate;

  if (!result || result.userErrors?.length) {
    throw new Error(
      result?.userErrors?.[0]?.message ?? "Unable to create Shopify subscription",
    );
  }

  return createPaidPlanRequest(
    shopId,
    plan,
    result.confirmationUrl,
    result.appSubscription.id,
  );
}
