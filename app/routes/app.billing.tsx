import {
  redirect,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import {
  activateFreePlan,
  BILLING_PLANS,
  createShopifySubscription,
  getActiveSubscription,
} from "../services/billing.server";
import { getEmbeddedShopContext } from "../utils/auth.server";
import type { SubscriptionPlan } from "@prisma/client";
import { getAppUrl } from "../utils/product";

export async function loader({ request }: LoaderFunctionArgs) {
  const { shopId } = await getEmbeddedShopContext(request);
  const subscription = await getActiveSubscription(shopId);
  return { subscription, plans: BILLING_PLANS };
}

export async function action({ request }: ActionFunctionArgs) {
  const { shopId, admin } = await getEmbeddedShopContext(request);
  const formData = await request.formData();
  const plan = String(formData.get("plan") ?? "FREE") as SubscriptionPlan;

  if (plan === "FREE") {
    await activateFreePlan(shopId);
    return redirect("/app/billing");
  }

  const returnUrl = `${getAppUrl(request)}/app/billing?charge=accepted`;
  const pending = await createShopifySubscription(admin, shopId, plan, returnUrl);

  if (pending.shopifyChargeUrl) {
    return redirect(pending.shopifyChargeUrl);
  }

  return redirect("/app/billing");
}

export default function EmbeddedBillingRoute() {
  const { subscription, plans } = useLoaderData<typeof loader>();

  return (
    <Page title="Billing" subtitle="Free, Starter, and Pro plans">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="p" variant="bodyMd">
              Current plan: <Badge tone="info">{subscription?.plan ?? "FREE"}</Badge>
            </Text>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
            {(Object.keys(plans) as SubscriptionPlan[]).map((plan) => (
              <Card key={plan}>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    {plans[plan].name}
                  </Text>
                  <Text as="p" variant="headingLg">
                    {plans[plan].price === 0
                      ? "Free"
                      : `$${plans[plan].price.toFixed(2)}/month`}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {plans[plan].description}
                  </Text>
                  <BlockStack gap="100">
                    {plans[plan].features.map((feature) => (
                      <Text as="p" key={feature} variant="bodySm">
                        • {feature}
                      </Text>
                    ))}
                  </BlockStack>
                  <form method="post">
                    <input type="hidden" name="plan" value={plan} />
                    <Button submit fullWidth variant={plan === "PRO" ? "primary" : undefined}>
                      {subscription?.plan === plan ? "Current plan" : `Choose ${plans[plan].name}`}
                    </Button>
                  </form>
                </BlockStack>
              </Card>
            ))}
          </InlineGrid>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
