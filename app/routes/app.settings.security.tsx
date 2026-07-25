import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineStack,
  Modal,
  Text,
} from "@shopify/polaris";

import { getCurrentShop } from "~/lib/current-shop.server";
import { db } from "~/lib/db.server";
import { useSettingsFormState } from "~/lib/use-settings-form-state";
import { feedService } from "~/services/feed.service.server";
import { settingsService } from "~/services/settings.service.server";
import { securitySettingsSchema } from "~/types/settings-form";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const settings = await settingsService.getSettings(shop.id);
  const feedCount = await db.feed.count({ where: { shopId: shop.id } });

  return json({
    requireSecretTokenGlobally: settings.requireSecretTokenGlobally,
    publicUrlsExpired: !!(
      settings.publicUrlsExpireAt && settings.publicUrlsExpireAt <= new Date()
    ),
    feedCount,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "update-toggle") {
    const parsed = securitySettingsSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) {
      return json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400 },
      );
    }
    await settingsService.updateSecurity(shop.id, parsed.data);
    return json({
      ok: true,
      message: "Security settings saved.",
      values: parsed.data.requireSecretTokenGlobally,
    });
  }

  if (intent === "regenerate-tokens") {
    const count = await feedService.regenerateAllSecretTokens(shop.id);
    return json({
      ok: true,
      message: `Regenerated secret tokens for ${count} feed${count === 1 ? "" : "s"}. Any previously shared private URLs no longer work.`,
    });
  }

  if (intent === "expire-public-urls") {
    await settingsService.setPublicUrlsExpireAt(shop.id, new Date());
    return json({
      ok: true,
      message:
        "Public feed URLs are now disabled. Private (token) URLs still work.",
    });
  }

  if (intent === "restore-public-urls") {
    await settingsService.setPublicUrlsExpireAt(shop.id, null);
    return json({ ok: true, message: "Public feed URL access restored." });
  }

  if (intent === "reset-all-settings") {
    const reset = await settingsService.resetAll(shop.id);
    return json({
      ok: true,
      message: "All settings have been reset to their defaults.",
      values: reset.requireSecretTokenGlobally,
    });
  }

  return json({ error: "Unknown action" }, { status: 400 });
}

export default function SecuritySettingsPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const submittingIntent =
    navigation.state === "submitting"
      ? navigation.formData?.get("intent")?.toString()
      : null;

  const message =
    actionData && "message" in actionData ? actionData.message : null;
  const error = actionData && "error" in actionData ? actionData.error : null;

  const requireTokenActionValue =
    actionData && "values" in actionData
      ? (actionData.values as boolean)
      : undefined;
  const [requireToken, setRequireToken] = useSettingsFormState(
    data.requireSecretTokenGlobally,
    requireTokenActionValue,
  );
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  return (
    <BlockStack gap="400">
      {message ? <Banner tone="success">{message}</Banner> : null}
      {error ? <Banner tone="critical">{error}</Banner> : null}

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Feed URL access
          </Text>

          <Form method="post">
            <input type="hidden" name="intent" value="update-toggle" />
            <BlockStack gap="300">
              <Checkbox
                label="Require secret token for all feeds"
                helpText="When on, every feed's public URL (no ?token=) is rejected, even for enabled feeds."
                name="requireSecretTokenGlobally"
                value="true"
                checked={requireToken}
                onChange={setRequireToken}
              />
              <InlineStack align="end">
                <Button submit loading={submittingIntent === "update-toggle"}>
                  Save
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>

          <BlockStack gap="200">
            <InlineStack gap="200" blockAlign="center">
              <Text as="span">Public URL status:</Text>
              <Badge tone={data.publicUrlsExpired ? "critical" : "success"}>
                {data.publicUrlsExpired ? "Expired" : "Active"}
              </Badge>
            </InlineStack>
            <InlineStack gap="200">
              <Form method="post">
                <input
                  type="hidden"
                  name="intent"
                  value={
                    data.publicUrlsExpired
                      ? "restore-public-urls"
                      : "expire-public-urls"
                  }
                />
                <Button
                  submit
                  tone={data.publicUrlsExpired ? undefined : "critical"}
                  loading={
                    submittingIntent === "expire-public-urls" ||
                    submittingIntent === "restore-public-urls"
                  }
                >
                  {data.publicUrlsExpired
                    ? "Restore public URL access"
                    : "Expire public URLs now"}
                </Button>
              </Form>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Feed secret tokens
          </Text>
          <Text as="p" tone="subdued">
            Rotates the private-URL token on every feed ({data.feedCount}{" "}
            total). Anything using the old private URL — ad platforms, saved
            links — stops working immediately.
          </Text>
          <InlineStack>
            <Button
              tone="critical"
              onClick={() => setRegenerateModalOpen(true)}
            >
              Regenerate all feed secret tokens
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            API tokens
          </Text>
          <Text as="p" tone="subdued">
            Your Shopify access token is managed automatically by Shopify&apos;s
            OAuth flow — there&apos;s nothing to rotate manually.
          </Text>
          <InlineStack>
            <Button disabled>Rotate API tokens</Button>
          </InlineStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd" tone="critical">
            Danger zone
          </Text>
          <Text as="p" tone="subdued">
            Resets every Settings section back to its default value. Feeds,
            products, and history are not affected.
          </Text>
          <InlineStack>
            <Button
              tone="critical"
              variant="primary"
              onClick={() => setResetModalOpen(true)}
            >
              Reset all settings
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      <Modal
        open={regenerateModalOpen}
        onClose={() => setRegenerateModalOpen(false)}
        title="Regenerate all feed secret tokens?"
        primaryAction={{
          content: "Regenerate tokens",
          destructive: true,
          loading: isSubmitting && submittingIntent === "regenerate-tokens",
          onAction: () => {
            const form = document.getElementById(
              "regenerate-tokens-form",
            ) as HTMLFormElement;
            form.requestSubmit();
          },
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setRegenerateModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            This immediately invalidates every feed&apos;s private URL. Any ad
            platform or integration still using the old link will start failing
            until you update it with the new URL. This cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
      <Form
        method="post"
        id="regenerate-tokens-form"
        style={{ display: "none" }}
      >
        <input type="hidden" name="intent" value="regenerate-tokens" />
      </Form>

      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset all settings to defaults?"
        primaryAction={{
          content: "Reset settings",
          destructive: true,
          loading: isSubmitting && submittingIntent === "reset-all-settings",
          onAction: () => {
            const form = document.getElementById(
              "reset-settings-form",
            ) as HTMLFormElement;
            form.requestSubmit();
          },
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setResetModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <Text as="p">
            Every value across General, Feed Defaults, Google Merchant, Meta
            Commerce, TikTok, Product Rules, Notifications, and Security reverts
            to its default. This cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
      <Form method="post" id="reset-settings-form" style={{ display: "none" }}>
        <input type="hidden" name="intent" value="reset-all-settings" />
      </Form>
    </BlockStack>
  );
}
