import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { InlineGrid, Select, TextField } from "@shopify/polaris";

import { SettingsForm } from "~/components/settings/SettingsForm";
import { getCurrentShop } from "~/lib/current-shop.server";
import { useSettingsFormState } from "~/lib/use-settings-form-state";
import { generalSettingsSchema } from "~/types/settings-form";
import type { GeneralSettingsInput } from "~/types/settings-form";
import {
  COUNTRIES,
  CURRENCIES,
  DATE_FORMATS,
  LANGUAGES,
  TIMEZONES,
} from "~/types/settings";
import { settingsService } from "~/services/settings.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const settings = await settingsService.getSettings(shop.id);

  return json({
    values: {
      storeName: settings.storeName,
      companyName: settings.companyName,
      supportEmail: settings.supportEmail,
      timezone: settings.timezone,
      defaultLanguage: settings.defaultLanguage,
      defaultCurrency: settings.defaultCurrency,
      country: settings.country,
      dateFormat: settings.dateFormat as GeneralSettingsInput["dateFormat"],
    } satisfies GeneralSettingsInput,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const parsed = generalSettingsSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  await settingsService.updateGeneral(shop.id, parsed.data);
  return json({ ok: true, saved: true, values: parsed.data });
}

export default function GeneralSettingsPage() {
  const { values: defaultValues } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [values, setValues] = useSettingsFormState(
    defaultValues,
    actionData && "values" in actionData ? actionData.values : undefined,
  );

  function updateField<K extends keyof GeneralSettingsInput>(
    key: K,
    value: GeneralSettingsInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsForm
      title="General"
      description="Basic identity and locale defaults for your store."
      isSubmitting={navigation.state === "submitting"}
      saved={actionData && "saved" in actionData ? actionData.saved : false}
      saveToken={actionData}
      error={actionData && "error" in actionData ? actionData.error : null}
      onReset={() => setValues(defaultValues)}
    >
      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <TextField
          label="Store name"
          name="storeName"
          autoComplete="off"
          value={values.storeName}
          onChange={(v) => updateField("storeName", v)}
        />
        <TextField
          label="Company name"
          name="companyName"
          autoComplete="off"
          value={values.companyName}
          onChange={(v) => updateField("companyName", v)}
        />
      </InlineGrid>

      <TextField
        label="Support email"
        name="supportEmail"
        type="email"
        autoComplete="off"
        value={values.supportEmail}
        onChange={(v) => updateField("supportEmail", v)}
      />

      <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
        <Select
          label="Timezone"
          name="timezone"
          options={TIMEZONES.map((tz) => ({ label: tz, value: tz }))}
          value={values.timezone}
          onChange={(v) => updateField("timezone", v)}
        />
        <Select
          label="Default language"
          name="defaultLanguage"
          options={LANGUAGES.map((l) => ({ label: l.label, value: l.value }))}
          value={values.defaultLanguage}
          onChange={(v) => updateField("defaultLanguage", v)}
        />
      </InlineGrid>

      <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
        <Select
          label="Default currency"
          name="defaultCurrency"
          options={CURRENCIES.map((c) => ({ label: c, value: c }))}
          value={values.defaultCurrency}
          onChange={(v) => updateField("defaultCurrency", v)}
        />
        <Select
          label="Country"
          name="country"
          options={COUNTRIES.map((c) => ({ label: c.label, value: c.value }))}
          value={values.country}
          onChange={(v) => updateField("country", v)}
        />
        <Select
          label="Date format"
          name="dateFormat"
          options={DATE_FORMATS.map((f) => ({ label: f, value: f }))}
          value={values.dateFormat}
          onChange={(v) =>
            updateField("dateFormat", v as GeneralSettingsInput["dateFormat"])
          }
        />
      </InlineGrid>
    </SettingsForm>
  );
}
