import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { InlineGrid, Select, TextField } from "@shopify/polaris";

import { SettingsForm } from "~/components/settings/SettingsForm";
import { getCurrentShop } from "~/lib/current-shop.server";
import { useSettingsFormState } from "~/lib/use-settings-form-state";
import { settingsService } from "~/services/settings.service.server";
import { metaCommerceSettingsSchema } from "~/types/settings-form";
import type { MetaCommerceSettingsInput } from "~/types/settings-form";
import { FACEBOOK_CATALOG_TYPES, PRODUCT_CONDITIONS } from "~/types/settings";
import { INVENTORY_POLICIES } from "~/types/product";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const settings = await settingsService.getSettings(shop.id);
  const m = settings.metaCommerce!;

  return json({
    values: {
      defaultBrand: m.defaultBrand,
      condition: m.condition as MetaCommerceSettingsInput["condition"],
      inventoryPolicy:
        m.inventoryPolicy as MetaCommerceSettingsInput["inventoryPolicy"],
      facebookCatalogType:
        m.facebookCatalogType as MetaCommerceSettingsInput["facebookCatalogType"],
    } satisfies MetaCommerceSettingsInput,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const parsed = metaCommerceSettingsSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  await settingsService.updateMetaCommerce(shop.id, parsed.data);
  return json({ ok: true, saved: true, values: parsed.data });
}

export default function MetaCommerceSettingsPage() {
  const { values: defaultValues } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [values, setValues] = useSettingsFormState(
    defaultValues,
    actionData && "values" in actionData ? actionData.values : undefined,
  );

  function updateField<K extends keyof MetaCommerceSettingsInput>(
    key: K,
    value: MetaCommerceSettingsInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsForm
      title="Meta Commerce"
      description="Default values applied to Meta (Facebook & Instagram) Commerce feeds."
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
          label="Condition"
          name="condition"
          options={PRODUCT_CONDITIONS.map((c) => ({ label: c, value: c }))}
          value={values.condition}
          onChange={(v) =>
            updateField(
              "condition",
              v as MetaCommerceSettingsInput["condition"],
            )
          }
        />
      </InlineGrid>

      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <Select
          label="Inventory policy"
          name="inventoryPolicy"
          options={INVENTORY_POLICIES.map((p) => ({
            label:
              p === "DENY"
                ? "Stop selling when out of stock"
                : "Continue selling when out of stock",
            value: p,
          }))}
          value={values.inventoryPolicy}
          onChange={(v) =>
            updateField(
              "inventoryPolicy",
              v as MetaCommerceSettingsInput["inventoryPolicy"],
            )
          }
        />
        <Select
          label="Facebook catalog type"
          name="facebookCatalogType"
          options={FACEBOOK_CATALOG_TYPES.map((t) => ({ label: t, value: t }))}
          value={values.facebookCatalogType}
          onChange={(v) =>
            updateField(
              "facebookCatalogType",
              v as MetaCommerceSettingsInput["facebookCatalogType"],
            )
          }
        />
      </InlineGrid>
    </SettingsForm>
  );
}
