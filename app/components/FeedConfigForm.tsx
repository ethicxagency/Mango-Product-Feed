import { useState } from "react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import type { FeedConfig, FeedRule } from "@prisma/client";
import { Form, useNavigation } from "react-router";
import {
  FILTER_MODE_LABELS,
  SCHEDULE_LABELS,
  type FeedConfigInput,
} from "../types/feed";
import type { FeedType } from "../types/product";
import { FEED_LABELS, FEED_TYPES } from "../types/product";
import { FeedRulesEditor } from "./FeedRulesEditor";

interface FilterOptions {
  categories: string[];
  brands: string[];
  productTypes: string[];
  products: { id: string; title: string; sku: string }[];
}

interface FeedConfigFormProps {
  config?: FeedConfig & { rules?: FeedRule[] };
  filterOptions: FilterOptions;
  errors?: Record<string, string>;
  submitLabel?: string;
}

function parseInitialValues(
  config?: FeedConfig & { rules?: FeedRule[] },
): FeedConfigInput & { selectedValues: string[]; rules: FeedRule[] } {
  if (!config) {
    return {
      name: "",
      feedType: "GOOGLE",
      filterMode: "ALL",
      filterValues: [],
      selectedValues: [],
      schedule: "MANUAL",
      isActive: true,
      rules: [],
    };
  }

  let selectedValues: string[] = [];
  try {
    selectedValues = JSON.parse(config.filterValues) as string[];
  } catch {
    selectedValues = [];
  }

  return {
    name: config.name,
    feedType: config.feedType,
    filterMode: config.filterMode,
    filterValues: selectedValues,
    selectedValues,
    schedule: config.schedule,
    isActive: config.isActive,
    rules: config.rules ?? [],
  };
}

export function FeedConfigForm({
  config,
  filterOptions,
  errors = {},
  submitLabel = "Save feed",
}: FeedConfigFormProps) {
  const navigation = useNavigation();
  const initial = parseInitialValues(config);
  const [formState, setFormState] = useState(initial);
  const isSubmitting = navigation.state === "submitting";

  const filterValueOptions = getFilterValueOptions(formState.filterMode, filterOptions);

  return (
    <Form method="post">
      <BlockStack gap="400">
        {errors.form && (
          <Banner tone="critical" title="Unable to save feed">
            <p>{errors.form}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Feed configuration
            </Text>
            <FormLayout>
              <TextField
                label="Feed name"
                name="name"
                value={formState.name}
                onChange={(value) => setFormState((current) => ({ ...current, name: value }))}
                autoComplete="off"
                error={errors.name}
              />
              <FormLayout.Group>
                <Select
                  label="Feed type"
                  options={FEED_TYPES.map((type) => ({
                    label: FEED_LABELS[type],
                    value: type,
                  }))}
                  value={formState.feedType}
                  onChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      feedType: value as FeedType,
                    }))
                  }
                  disabled={Boolean(config?.isDefault)}
                />
                <Select
                  label="Schedule"
                  options={Object.entries(SCHEDULE_LABELS).map(([value, label]) => ({
                    label,
                    value,
                  }))}
                  value={formState.schedule}
                  onChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      schedule: value as FeedConfigInput["schedule"],
                    }))
                  }
                />
              </FormLayout.Group>
              <Select
                label="Product selection"
                options={Object.entries(FILTER_MODE_LABELS).map(([value, label]) => ({
                  label,
                  value,
                }))}
                value={formState.filterMode}
                onChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    filterMode: value as FeedConfigInput["filterMode"],
                    selectedValues: [],
                  }))
                }
              />
              {formState.filterMode !== "ALL" && (
                <Select
                  label="Filter values"
                  options={[
                    { label: "Select values", value: "" },
                    ...filterValueOptions,
                  ]}
                  value=""
                  onChange={(value) => {
                    if (!value || formState.selectedValues.includes(value)) return;
                    setFormState((current) => ({
                      ...current,
                      selectedValues: [...current.selectedValues, value],
                    }));
                  }}
                />
              )}
              {formState.selectedValues.length > 0 && (
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    Selected values
                  </Text>
                  <InlineStack gap="200">
                    {formState.selectedValues.map((value) => (
                      <Button
                        key={value}
                        onClick={() =>
                          setFormState((current) => ({
                            ...current,
                            selectedValues: current.selectedValues.filter(
                              (item) => item !== value,
                            ),
                          }))
                        }
                      >
                        {value} ×
                      </Button>
                    ))}
                  </InlineStack>
                </BlockStack>
              )}
              <Checkbox
                label="Feed is active"
                checked={formState.isActive}
                onChange={(checked) =>
                  setFormState((current) => ({ ...current, isActive: checked }))
                }
              />
            </FormLayout>
          </BlockStack>
        </Card>

        <FeedRulesEditor
          rules={formState.rules}
          onChange={(rules) => setFormState((current) => ({ ...current, rules }))}
        />

        <input type="hidden" name="name" value={formState.name} />
        <input type="hidden" name="feedType" value={formState.feedType} />
        <input type="hidden" name="filterMode" value={formState.filterMode} />
        <input type="hidden" name="filterValues" value={JSON.stringify(formState.selectedValues)} />
        <input type="hidden" name="schedule" value={formState.schedule} />
        <input type="hidden" name="isActive" value={String(formState.isActive)} />
        <input type="hidden" name="rules" value={JSON.stringify(formState.rules)} />

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button submit variant="primary" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </BlockStack>
    </Form>
  );
}

function getFilterValueOptions(
  filterMode: FeedConfigInput["filterMode"],
  options: FilterOptions,
) {
  switch (filterMode) {
    case "PRODUCTS":
      return options.products.map((product) => ({
        label: `${product.title} (${product.sku})`,
        value: product.id,
      }));
    case "CATEGORIES":
      return options.categories.map((value) => ({ label: value, value }));
    case "BRANDS":
      return options.brands.map((value) => ({ label: value, value }));
    case "PRODUCT_TYPES":
      return options.productTypes.map((value) => ({ label: value, value }));
    default:
      return [];
  }
}

function InlineStack({
  children,
}: {
  gap: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {children}
    </div>
  );
}
