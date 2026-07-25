import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  BlockStack,
  Checkbox,
  InlineGrid,
  Select,
  TextField,
} from "@shopify/polaris";

import { SettingsForm } from "~/components/settings/SettingsForm";
import { FEED_CHANNEL_LABELS } from "~/lib/feed-channels";
import { getCurrentShop } from "~/lib/current-shop.server";
import { useSettingsFormState } from "~/lib/use-settings-form-state";
import { settingsService } from "~/services/settings.service.server";
import { feedDefaultsSettingsSchema } from "~/types/settings-form";
import type { FeedDefaultsSettingsInput } from "~/types/settings-form";
import {
  COUNTRIES,
  CURRENCIES,
  DEFAULT_FEED_PLATFORMS,
  LANGUAGES,
} from "~/types/settings";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const settings = await settingsService.getSettings(shop.id);

  return json({
    values: {
      defaultPlatform:
        settings.defaultPlatform as FeedDefaultsSettingsInput["defaultPlatform"],
      feedDefaultLanguage: settings.feedDefaultLanguage,
      feedDefaultCurrency: settings.feedDefaultCurrency,
      feedDefaultCountry: settings.feedDefaultCountry,
      feedIncludeVariants: settings.feedIncludeVariants,
      feedIncludeOutOfStock: settings.feedIncludeOutOfStock,
      feedIncludeDraftProducts: settings.feedIncludeDraftProducts,
      feedDefaultProductLimit: settings.feedDefaultProductLimit,
      feedEnablePrettyXml: settings.feedEnablePrettyXml,
      feedEnableXmlCompression: settings.feedEnableXmlCompression,
    } satisfies FeedDefaultsSettingsInput,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const parsed = feedDefaultsSettingsSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  await settingsService.updateFeedDefaults(shop.id, parsed.data);
  return json({ ok: true, saved: true, values: parsed.data });
}

export default function FeedDefaultsSettingsPage() {
  const { values: defaultValues } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [values, setValues] = useSettingsFormState(
    defaultValues,
    actionData && "values" in actionData ? actionData.values : undefined,
  );

  function updateField<K extends keyof FeedDefaultsSettingsInput>(
    key: K,
    value: FeedDefaultsSettingsInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsForm
      title="Feed Defaults"
      description="Applied automatically whenever you create a new feed."
      isSubmitting={navigation.state === "submitting"}
      saved={actionData && "saved" in actionData ? actionData.saved : false}
      saveToken={actionData}
      error={actionData && "error" in actionData ? actionData.error : null}
      onReset={() => setValues(defaultValues)}
    >
      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <Select
          label="Default platform"
          name="defaultPlatform"
          options={DEFAULT_FEED_PLATFORMS.map((p) => ({
            label: FEED_CHANNEL_LABELS[p],
            value: p,
          }))}
          value={values.defaultPlatform}
          onChange={(v) =>
            updateField(
              "defaultPlatform",
              v as FeedDefaultsSettingsInput["defaultPlatform"],
            )
          }
        />
        <Select
          label="Default language"
          name="feedDefaultLanguage"
          options={LANGUAGES.map((l) => ({ label: l.label, value: l.value }))}
          value={values.feedDefaultLanguage}
          onChange={(v) => updateField("feedDefaultLanguage", v)}
        />
      </InlineGrid>

      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <Select
          label="Default currency"
          name="feedDefaultCurrency"
          options={CURRENCIES.map((c) => ({ label: c, value: c }))}
          value={values.feedDefaultCurrency}
          onChange={(v) => updateField("feedDefaultCurrency", v)}
        />
        <Select
          label="Default country"
          name="feedDefaultCountry"
          options={COUNTRIES.map((c) => ({ label: c.label, value: c.value }))}
          value={values.feedDefaultCountry}
          onChange={(v) => updateField("feedDefaultCountry", v)}
        />
      </InlineGrid>

      <TextField
        label="Default product limit"
        name="feedDefaultProductLimit"
        type="number"
        autoComplete="off"
        placeholder="No limit"
        value={values.feedDefaultProductLimit?.toString() ?? ""}
        onChange={(v) =>
          updateField("feedDefaultProductLimit", v === "" ? null : Number(v))
        }
        helpText="Maximum number of products a new feed will export by default. Leave blank for no limit."
      />

      <BlockStack gap="200">
        <Checkbox
          label="Include variants"
          name="feedIncludeVariants"
          value="true"
          checked={values.feedIncludeVariants}
          onChange={(v) => updateField("feedIncludeVariants", v)}
        />
        <Checkbox
          label="Include out of stock products"
          name="feedIncludeOutOfStock"
          value="true"
          checked={values.feedIncludeOutOfStock}
          onChange={(v) => updateField("feedIncludeOutOfStock", v)}
        />
        <Checkbox
          label="Include draft products"
          name="feedIncludeDraftProducts"
          value="true"
          checked={values.feedIncludeDraftProducts}
          onChange={(v) => updateField("feedIncludeDraftProducts", v)}
        />
        <Checkbox
          label="Enable pretty XML"
          name="feedEnablePrettyXml"
          value="true"
          checked={values.feedEnablePrettyXml}
          onChange={(v) => updateField("feedEnablePrettyXml", v)}
        />
        <Checkbox
          label="Enable XML compression"
          name="feedEnableXmlCompression"
          value="true"
          checked={values.feedEnableXmlCompression}
          onChange={(v) => updateField("feedEnableXmlCompression", v)}
          disabled
          helpText="Coming soon — compressed (.xml.gz) feed output."
        />
      </BlockStack>
    </SettingsForm>
  );
}
