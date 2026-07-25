import { useEffect, useState } from "react";
import { Form } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Text,
  Toast,
} from "@shopify/polaris";

export interface SettingsFormProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isSubmitting: boolean;
  /** True on the response right after a successful save — triggers the
   * confirmation toast. Pass the raw actionData field straight through;
   * this component keys off the *action count*, not the boolean value, so
   * it fires correctly even on back-to-back saves that both return true. */
  saved?: boolean;
  /** Bump this (e.g. a counter, or navigation state) once per submission so
   * the toast can tell "still the same save" apart from "a new one just
   * completed" even when `saved` is `true` both times. */
  saveToken: unknown;
  error?: string | null;
  /** Discards unsaved local edits by restoring the fields to their loaded
   * values. Section pages own their own field state, so this is just a
   * callback into that state rather than a server round-trip. */
  onReset: () => void;
  saveLabel?: string;
}

/**
 * Shared chrome for every Settings section: a Card, a Remix <Form>, a
 * Save/Reset action row, and a save-confirmation Toast — one place that
 * owns this pattern instead of each of the ~10 section pages re-building
 * the same Card/Form/Toast boilerplate.
 */
export function SettingsForm({
  title,
  description,
  children,
  isSubmitting,
  saved,
  saveToken,
  error,
  onReset,
  saveLabel = "Save",
}: SettingsFormProps) {
  const [toastActive, setToastActive] = useState(false);

  // Fires once per completed submission (saveToken changes every time
  // useActionData returns a new response), unlike comparing the `saved`
  // boolean directly — that stays `true` across repeated successful saves
  // and would only show the toast the first time.
  useEffect(() => {
    if (saved) setToastActive(true);
  }, [saveToken]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Form method="post">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                {title}
              </Text>
              {description ? (
                <Text as="p" tone="subdued">
                  {description}
                </Text>
              ) : null}
            </BlockStack>

            {error ? <Banner tone="critical">{error}</Banner> : null}

            {children}

            <InlineStack align="end" gap="200">
              <Button onClick={onReset} disabled={isSubmitting}>
                Reset
              </Button>
              <Button submit variant="primary" loading={isSubmitting}>
                {saveLabel}
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>

      {toastActive ? (
        <Toast
          content={`${title} saved`}
          onDismiss={() => setToastActive(false)}
        />
      ) : null}
    </Form>
  );
}
