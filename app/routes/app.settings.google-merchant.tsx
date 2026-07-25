import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  BlockStack,
  Checkbox,
  InlineGrid,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";

import { SettingsForm } from "~/components/settings/SettingsForm";
import { getCurrentShop } from "~/lib/current-shop.server";
import { useSettingsFormState } from "~/lib/use-settings-form-state";
import { settingsService } from "~/services/settings.service.server";
import { googleMerchantSettingsSchema } from "~/types/settings-form";
import type { GoogleMerchantSettingsInput } from "~/types/settings-form";
import { COUNTRIES, PRODUCT_CONDITIONS } from "~/types/settings";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const settings = await settingsService.getSettings(shop.id);
  const g = settings.googleMerchant!;

  return json({
    values: {
      defaultBrand: g.defaultBrand,
      defaultCondition:
        g.defaultCondition as GoogleMerchantSettingsInput["defaultCondition"],
      identifierExists: g.identifierExists,
      shippingCountry: g.shippingCountry,
      shippingPrice: g.shippingPrice,
      taxEnabled: g.taxEnabled,
      defaultProductCategory: g.defaultProductCategory,
      defaultCustomLabel0: g.defaultCustomLabel0,
      defaultCustomLabel1: g.defaultCustomLabel1,
      defaultCustomLabel2: g.defaultCustomLabel2,
      defaultCustomLabel3: g.defaultCustomLabel3,
      defaultCustomLabel4: g.defaultCustomLabel4,
    } satisfies GoogleMerchantSettingsInput,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const parsed = googleMerchantSettingsSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  await settingsService.updateGoogleMerchant(shop.id, parsed.data);
  return json({ ok: true, saved: true, values: parsed.data });
}

export default function GoogleMerchantSettingsPage() {
  const { values: defaultValues } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [values, setValues] = useSettingsFormState(
    defaultValues,
    actionData && "values" in actionData ? actionData.values : undefined,
  );

  function updateField<K extends keyof GoogleMerchantSettingsInput>(
    key: K,
    value: GoogleMerchantSettingsInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsForm
      title="Google Merchant"
      description="Default values applied to Google Merchant Center feeds."
      isSubmitting={navigation.state === "submitting"}
      saved={actionData && "saved" in actionData ? actionData.saved : false}
      saveToken={actionData}
      error={actionData && "error" in actionData ? actionData.error : null}
      onReset={() => setValues(defaultValues)}
    >
      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <TextField
          label="Default brand"
          name="defaultBrand"
          autoComplete="off"
          value={values.defaultBrand}
          onChange={(v) => updateField("defaultBrand", v)}
        />
        <Select
          label="Default condition"
          name="defaultCondition"
          options={PRODUCT_CONDITIONS.map((c) => ({ label: c, value: c }))}
          value={values.defaultCondition}
          onChange={(v) =>
            updateField(
              "defaultCondition",
              v as GoogleMerchantSettingsInput["defaultCondition"],
            )
          }
        />
      </InlineGrid>

      <TextField
        label="Google product category default"
        name="defaultProductCategory"
        autoComplete="off"
        value={values.defaultProductCategory}
        onChange={(v) => updateField("defaultProductCategory", v)}
        helpText="e.g. Apparel & Accessories > Clothing"
      />

      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <Select
          label="Shipping country"
          name="shippingCountry"
          options={COUNTRIES.map((c) => ({ label: c.label, value: c.value }))}
          value={values.shippingCountry}
          onChange={(v) => updateField("shippingCountry", v)}
        />
        <TextField
          label="Shipping price"
          name="shippingPrice"
          type="number"
          autoComplete="off"
          placeholder="0.00"
          value={values.shippingPrice?.toString() ?? ""}
          onChange={(v) =>
            updateField("shippingPrice", v === "" ? null : Number(v))
          }
        />
      </InlineGrid>

      <BlockStack gap="200">
        <Checkbox
          label="Identifier exists"
          name="identifierExists"
          value="true"
          checked={values.identifierExists}
          onChange={(v) => updateField("identifierExists", v)}
          helpText="Whether products typically have a GTIN, MPN, or brand identifier"
        />
        <Checkbox
          label="Tax enabled"
          name="taxEnabled"
          value="true"
          checked={values.taxEnabled}
          onChange={(v) => updateField("taxEnabled", v)}
        />
      </BlockStack>

      <BlockStack gap="200">
        <Text as="h3" variant="headingSm">
          Default custom labels
        </Text>
        <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
          <TextField
            label="Custom label 0"
            name="defaultCustomLabel0"
            autoComplete="off"
            value={values.defaultCustomLabel0}
            onChange={(v) => updateField("defaultCustomLabel0", v)}
          />
          <TextField
            label="Custom label 1"
            name="defaultCustomLabel1"
            autoComplete="off"
            value={values.defaultCustomLabel1}
            onChange={(v) => updateField("defaultCustomLabel1", v)}
          />
          <TextField
            label="Custom label 2"
            name="defaultCustomLabel2"
            autoComplete="off"
            value={values.defaultCustomLabel2}
            onChange={(v) => updateField("defaultCustomLabel2", v)}
          />
          <TextField
            label="Custom label 3"
            name="defaultCustomLabel3"
            autoComplete="off"
            value={values.defaultCustomLabel3}
            onChange={(v) => updateField("defaultCustomLabel3", v)}
          />
          <TextField
            label="Custom label 4"
            name="defaultCustomLabel4"
            autoComplete="off"
            value={values.defaultCustomLabel4}
            onChange={(v) => updateField("defaultCustomLabel4", v)}
          />
        </InlineGrid>
      </BlockStack>
    </SettingsForm>
  );
}
