import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { BlockStack, Checkbox, TextField } from "@shopify/polaris";

import { SettingsForm } from "~/components/settings/SettingsForm";
import { getCurrentShop } from "~/lib/current-shop.server";
import { useSettingsFormState } from "~/lib/use-settings-form-state";
import { settingsService } from "~/services/settings.service.server";
import { notificationsSettingsSchema } from "~/types/settings-form";
import type { NotificationsSettingsInput } from "~/types/settings-form";

export async function loader({ request }: LoaderFunctionArgs) {
  const shop = await getCurrentShop(request);
  const settings = await settingsService.getSettings(shop.id);

  return json({
    values: {
      notifyFeedGenerationFailed: settings.notifyFeedGenerationFailed,
      notifySynchronizationFailed: settings.notifySynchronizationFailed,
      notifyWeeklyFeedReport: settings.notifyWeeklyFeedReport,
      notifyWebhookErrors: settings.notifyWebhookErrors,
      notificationEmail: settings.notificationEmail,
    } satisfies NotificationsSettingsInput,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const shop = await getCurrentShop(request);
  const formData = await request.formData();
  const parsed = notificationsSettingsSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  await settingsService.updateNotifications(shop.id, parsed.data);
  return json({ ok: true, saved: true, values: parsed.data });
}

export default function NotificationsSettingsPage() {
  const { values: defaultValues } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [values, setValues] = useSettingsFormState(
    defaultValues,
    actionData && "values" in actionData ? actionData.values : undefined,
  );

  function updateField<K extends keyof NotificationsSettingsInput>(
    key: K,
    value: NotificationsSettingsInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsForm
      title="Notifications"
      description="Email alerts for feed and sync activity."
      isSubmitting={navigation.state === "submitting"}
      saved={actionData && "saved" in actionData ? actionData.saved : false}
      saveToken={actionData}
      error={actionData && "error" in actionData ? actionData.error : null}
      onReset={() => setValues(defaultValues)}
    >
      <TextField
        label="Notification email"
        name="notificationEmail"
        type="email"
        autoComplete="off"
        placeholder="Defaults to support email if left blank"
        value={values.notificationEmail}
        onChange={(v) => updateField("notificationEmail", v)}
      />

      <BlockStack gap="200">
        <Checkbox
          label="Feed generation failed"
          name="notifyFeedGenerationFailed"
          value="true"
          checked={values.notifyFeedGenerationFailed}
          onChange={(v) => updateField("notifyFeedGenerationFailed", v)}
        />
        <Checkbox
          label="Synchronization failed"
          name="notifySynchronizationFailed"
          value="true"
          checked={values.notifySynchronizationFailed}
          onChange={(v) => updateField("notifySynchronizationFailed", v)}
        />
        <Checkbox
          label="Weekly feed report"
          name="notifyWeeklyFeedReport"
          value="true"
          checked={values.notifyWeeklyFeedReport}
          onChange={(v) => updateField("notifyWeeklyFeedReport", v)}
        />
        <Checkbox
          label="Webhook errors"
          name="notifyWebhookErrors"
          value="true"
          checked={values.notifyWebhookErrors}
          onChange={(v) => updateField("notifyWebhookErrors", v)}
        />
      </BlockStack>
    </SettingsForm>
  );
}
