import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { BlockStack, InlineGrid, Checkbox, TextField } from "@shopify/polaris";

import { SettingsForm } from "~/components/settings/SettingsForm";
import { getCurrentShop } from "~/lib/current-shop.server";
import { useSettingsFormState } from "~/lib/use-settings-form-state";
import { settingsService } from "~/services/settings.service.server";
import { productRulesSettingsSchema } from "~/types/settings-form";
import type { ProductRulesSettingsInput } from "~/types/settings-form";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const settings = await settingsService.getSettings(shop.id);
  const r = settings.productRules!;

  return json({
    values: {
      excludeDraftProducts: r.excludeDraftProducts,
      excludeArchivedProducts: r.excludeArchivedProducts,
      excludeOutOfStock: r.excludeOutOfStock,
      excludeNoImage: r.excludeNoImage,
      excludeNoSku: r.excludeNoSku,
      excludeNoGtin: r.excludeNoGtin,
      excludeHiddenProducts: r.excludeHiddenProducts,
      excludeAdultProducts: r.excludeAdultProducts,
      minPrice: r.minPrice,
      maxPrice: r.maxPrice,
    } satisfies ProductRulesSettingsInput,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const parsed = productRulesSettingsSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  await settingsService.updateProductRules(shop.id, parsed.data);
  return json({ ok: true, saved: true, values: parsed.data });
}

const RULE_LABELS: [keyof ProductRulesSettingsInput, string][] = [
  ["excludeDraftProducts", "Exclude draft products"],
  ["excludeArchivedProducts", "Exclude archived products"],
  ["excludeOutOfStock", "Exclude out of stock products"],
  ["excludeNoImage", "Exclude products without images"],
  ["excludeNoSku", "Exclude products without SKU"],
  ["excludeNoGtin", "Exclude products without GTIN"],
  ["excludeHiddenProducts", "Exclude hidden products"],
  ["excludeAdultProducts", "Exclude adult products"],
];

export default function ProductRulesSettingsPage() {
  const { values: defaultValues } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [values, setValues] = useSettingsFormState(
    defaultValues,
    actionData && "values" in actionData ? actionData.values : undefined,
  );

  function updateField<K extends keyof ProductRulesSettingsInput>(
    key: K,
    value: ProductRulesSettingsInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsForm
      title="Product Rules"
      description="Global default exclusion rules — used to pre-fill the rules on every new feed you create."
      isSubmitting={navigation.state === "submitting"}
      saved={actionData && "saved" in actionData ? actionData.saved : false}
      saveToken={actionData}
      error={actionData && "error" in actionData ? actionData.error : null}
      onReset={() => setValues(defaultValues)}
    >
      <BlockStack gap="200">
        {RULE_LABELS.map(([key, label]) => (
          <Checkbox
            key={key}
            label={label}
            name={key}
            value="true"
            checked={values[key] as boolean}
            onChange={(v) =>
              updateField(key, v as ProductRulesSettingsInput[typeof key])
            }
          />
        ))}
      </BlockStack>

      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <TextField
          label="Minimum price"
          name="minPrice"
          type="number"
          autoComplete="off"
          placeholder="No minimum"
          value={values.minPrice?.toString() ?? ""}
          onChange={(v) => updateField("minPrice", v === "" ? null : Number(v))}
        />
        <TextField
          label="Maximum price"
          name="maxPrice"
          type="number"
          autoComplete="off"
          placeholder="No maximum"
          value={values.maxPrice?.toString() ?? ""}
          onChange={(v) => updateField("maxPrice", v === "" ? null : Number(v))}
        />
      </InlineGrid>
    </SettingsForm>
  );
}
