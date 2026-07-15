import { useState } from "react";
import { Form } from "@remix-run/react";
import {
  Autocomplete,
  BlockStack,
  Button,
  Card,
  Checkbox,
  ChoiceList,
  Icon,
  InlineGrid,
  InlineStack,
  Page,
  Select,
  Tag,
  Text,
  TextField,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";

import { FEED_CHANNEL_LABELS } from "~/lib/feed-channels";
import { FEED_CHANNELS, PRODUCT_SELECTION_TYPES } from "~/types/feed";
import type { FeedFormInput } from "~/types/feed-form";

export interface FeedFormOption {
  id: string;
  label: string;
}

export interface FeedFormProduct {
  id: string;
  title: string;
  vendor: string;
}

const SELECTION_TYPE_LABELS: Record<
  (typeof PRODUCT_SELECTION_TYPES)[number],
  string
> = {
  ALL: "All products",
  COLLECTIONS: "Specific collections",
  TAGS: "Specific tags",
  VENDOR: "Specific vendors",
  PRODUCT_TYPE: "Specific product types",
  MANUAL: "Manual product selection",
};

function dateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export const DEFAULT_FEED_FORM_VALUES: FeedFormInput = {
  name: "",
  channel: "GOOGLE",
  rootNode: "feed",
  itemNode: "item",
  prettyPrint: true,
  useCdata: true,
  productSelectionType: "ALL",
  collectionIds: [],
  tagIds: [],
  vendors: [],
  productTypes: [],
  manualProductIds: [],
  includeOutOfStock: false,
  includeVariants: true,
  includeWithoutGtin: true,
  includeWithoutSku: true,
  skipDuplicateProducts: true,
  skipDuplicateVariants: true,
  skipBrokenImages: true,
  onlyPublished: true,
  onlyActive: true,
  priceMin: null,
  priceMax: null,
  createdAfter: null,
  createdBefore: null,
  updatedAfter: null,
  updatedBefore: null,
};

export interface FeedFormProps {
  collections: FeedFormOption[];
  tags: FeedFormOption[];
  vendors: string[];
  productTypes: string[];
  products: FeedFormProduct[];
  defaultValues?: FeedFormInput;
  submitLabel: string;
  pageTitle: string;
  isSubmitting?: boolean;
  formError?: string | null;
  /** Extra content (status, URLs, delete/duplicate actions) rendered above the form fields. */
  beforeFormContent?: React.ReactNode;
  pageSecondaryActions?: React.ComponentProps<typeof Page>["secondaryActions"];
}

export function FeedForm({
  collections,
  tags,
  vendors,
  productTypes,
  products,
  defaultValues = DEFAULT_FEED_FORM_VALUES,
  submitLabel,
  pageTitle,
  isSubmitting = false,
  formError,
  beforeFormContent,
  pageSecondaryActions,
}: FeedFormProps) {
  const [values, setValues] = useState<FeedFormInput>(defaultValues);
  const [productQuery, setProductQuery] = useState("");

  function updateField<K extends keyof FeedFormInput>(
    key: K,
    value: FeedFormInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const productOptions = products
    .filter((p) => p.title.toLowerCase().includes(productQuery.toLowerCase()))
    .map((p) => ({ value: p.id, label: `${p.title} — ${p.vendor}` }));

  return (
    <Page
      title={pageTitle}
      backAction={{ url: "/app/feeds" }}
      secondaryActions={pageSecondaryActions}
    >
      <Form method="post">
        <BlockStack gap="400">
          {beforeFormContent}
          {formError ? (
            <Card>
              <Text as="p" tone="critical">
                {formError}
              </Text>
            </Card>
          ) : null}

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Feed details
              </Text>
              <TextField
                label="Feed name"
                name="name"
                autoComplete="off"
                value={values.name}
                onChange={(v) => updateField("name", v)}
                requiredIndicator
              />
              <Select
                label="Channel"
                name="channel"
                options={FEED_CHANNELS.map((c) => ({
                  label: FEED_CHANNEL_LABELS[c],
                  value: c,
                }))}
                value={values.channel}
                onChange={(v) =>
                  updateField("channel", v as FeedFormInput["channel"])
                }
              />
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                XML output options
              </Text>
              <InlineGrid columns={2} gap="400">
                <TextField
                  label="Custom root node"
                  name="rootNode"
                  autoComplete="off"
                  value={values.rootNode}
                  onChange={(v) => updateField("rootNode", v)}
                  helpText="Only applies to the Custom XML channel"
                />
                <TextField
                  label="Custom item node"
                  name="itemNode"
                  autoComplete="off"
                  value={values.itemNode}
                  onChange={(v) => updateField("itemNode", v)}
                  helpText="Only applies to the Custom XML channel"
                />
              </InlineGrid>
              <Checkbox
                label="Pretty print XML"
                name="prettyPrint"
                value="true"
                checked={values.prettyPrint}
                onChange={(checked) => updateField("prettyPrint", checked)}
              />
              <Checkbox
                label="Wrap text fields in CDATA"
                name="useCdata"
                value="true"
                checked={values.useCdata}
                onChange={(checked) => updateField("useCdata", checked)}
              />
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Product selection
              </Text>
              <Select
                label="Include"
                options={PRODUCT_SELECTION_TYPES.map((t) => ({
                  label: SELECTION_TYPE_LABELS[t],
                  value: t,
                }))}
                value={values.productSelectionType}
                onChange={(v) =>
                  updateField(
                    "productSelectionType",
                    v as FeedFormInput["productSelectionType"],
                  )
                }
              />
              <input
                type="hidden"
                name="productSelectionType"
                value={values.productSelectionType}
              />

              {values.productSelectionType === "COLLECTIONS" && (
                <ChoiceList
                  title="Collections"
                  allowMultiple
                  choices={collections.map((c) => ({
                    label: c.label,
                    value: c.id,
                  }))}
                  selected={values.collectionIds}
                  onChange={(v) => updateField("collectionIds", v)}
                />
              )}
              {values.collectionIds.map((id) => (
                <input key={id} type="hidden" name="collectionIds" value={id} />
              ))}

              {values.productSelectionType === "TAGS" && (
                <ChoiceList
                  title="Tags"
                  allowMultiple
                  choices={tags.map((t) => ({ label: t.label, value: t.id }))}
                  selected={values.tagIds}
                  onChange={(v) => updateField("tagIds", v)}
                />
              )}
              {values.tagIds.map((id) => (
                <input key={id} type="hidden" name="tagIds" value={id} />
              ))}

              {values.productSelectionType === "VENDOR" && (
                <ChoiceList
                  title="Vendors"
                  allowMultiple
                  choices={vendors.map((v) => ({ label: v, value: v }))}
                  selected={values.vendors}
                  onChange={(v) => updateField("vendors", v)}
                />
              )}
              {values.vendors.map((v) => (
                <input key={v} type="hidden" name="vendors" value={v} />
              ))}

              {values.productSelectionType === "PRODUCT_TYPE" && (
                <ChoiceList
                  title="Product types"
                  allowMultiple
                  choices={productTypes.map((t) => ({ label: t, value: t }))}
                  selected={values.productTypes}
                  onChange={(v) => updateField("productTypes", v)}
                />
              )}
              {values.productTypes.map((t) => (
                <input key={t} type="hidden" name="productTypes" value={t} />
              ))}

              {values.productSelectionType === "MANUAL" && (
                <BlockStack gap="200">
                  <Autocomplete
                    allowMultiple
                    options={productOptions}
                    selected={values.manualProductIds}
                    onSelect={(v) => updateField("manualProductIds", v)}
                    textField={
                      <Autocomplete.TextField
                        label="Products"
                        prefix={<Icon source={SearchIcon} />}
                        onChange={setProductQuery}
                        value={productQuery}
                        autoComplete="off"
                        placeholder="Search products by title"
                      />
                    }
                  />
                  <InlineStack gap="100">
                    {values.manualProductIds.map((id) => {
                      const product = products.find((p) => p.id === id);
                      if (!product) return null;
                      return (
                        <Tag
                          key={id}
                          onRemove={() =>
                            updateField(
                              "manualProductIds",
                              values.manualProductIds.filter(
                                (pid) => pid !== id,
                              ),
                            )
                          }
                        >
                          {product.title}
                        </Tag>
                      );
                    })}
                  </InlineStack>
                </BlockStack>
              )}
              {values.manualProductIds.map((id) => (
                <input
                  key={id}
                  type="hidden"
                  name="manualProductIds"
                  value={id}
                />
              ))}
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Additional filters
              </Text>
              <InlineGrid columns={2} gap="400">
                <TextField
                  label="Minimum price"
                  name="priceMin"
                  type="number"
                  autoComplete="off"
                  value={values.priceMin?.toString() ?? ""}
                  onChange={(v) =>
                    updateField("priceMin", v === "" ? null : Number(v))
                  }
                />
                <TextField
                  label="Maximum price"
                  name="priceMax"
                  type="number"
                  autoComplete="off"
                  value={values.priceMax?.toString() ?? ""}
                  onChange={(v) =>
                    updateField("priceMax", v === "" ? null : Number(v))
                  }
                />
                <TextField
                  label="Created after"
                  name="createdAfter"
                  type="date"
                  autoComplete="off"
                  value={dateInputValue(values.createdAfter)}
                  onChange={(v) =>
                    updateField("createdAfter", v ? new Date(v) : null)
                  }
                />
                <TextField
                  label="Created before"
                  name="createdBefore"
                  type="date"
                  autoComplete="off"
                  value={dateInputValue(values.createdBefore)}
                  onChange={(v) =>
                    updateField("createdBefore", v ? new Date(v) : null)
                  }
                />
                <TextField
                  label="Updated after"
                  name="updatedAfter"
                  type="date"
                  autoComplete="off"
                  value={dateInputValue(values.updatedAfter)}
                  onChange={(v) =>
                    updateField("updatedAfter", v ? new Date(v) : null)
                  }
                />
                <TextField
                  label="Updated before"
                  name="updatedBefore"
                  type="date"
                  autoComplete="off"
                  value={dateInputValue(values.updatedBefore)}
                  onChange={(v) =>
                    updateField("updatedBefore", v ? new Date(v) : null)
                  }
                />
              </InlineGrid>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Ecommerce rules
              </Text>
              <Checkbox
                label="Only export published products"
                name="onlyPublished"
                value="true"
                checked={values.onlyPublished}
                onChange={(v) => updateField("onlyPublished", v)}
              />
              <Checkbox
                label="Only export active products"
                name="onlyActive"
                value="true"
                checked={values.onlyActive}
                onChange={(v) => updateField("onlyActive", v)}
              />
              <Checkbox
                label="Include out of stock products"
                name="includeOutOfStock"
                value="true"
                checked={values.includeOutOfStock}
                onChange={(v) => updateField("includeOutOfStock", v)}
              />
              <Checkbox
                label="Include variants"
                name="includeVariants"
                value="true"
                checked={values.includeVariants}
                onChange={(v) => updateField("includeVariants", v)}
              />
              <Checkbox
                label="Include products without GTIN/barcode"
                name="includeWithoutGtin"
                value="true"
                checked={values.includeWithoutGtin}
                onChange={(v) => updateField("includeWithoutGtin", v)}
              />
              <Checkbox
                label="Include products without SKU"
                name="includeWithoutSku"
                value="true"
                checked={values.includeWithoutSku}
                onChange={(v) => updateField("includeWithoutSku", v)}
              />
              <Checkbox
                label="Skip duplicate products"
                name="skipDuplicateProducts"
                value="true"
                checked={values.skipDuplicateProducts}
                onChange={(v) => updateField("skipDuplicateProducts", v)}
              />
              <Checkbox
                label="Skip duplicate variants"
                name="skipDuplicateVariants"
                value="true"
                checked={values.skipDuplicateVariants}
                onChange={(v) => updateField("skipDuplicateVariants", v)}
              />
              <Checkbox
                label="Skip broken images"
                name="skipBrokenImages"
                value="true"
                checked={values.skipBrokenImages}
                onChange={(v) => updateField("skipBrokenImages", v)}
              />
            </BlockStack>
          </Card>

          <InlineStack align="end">
            <Button submit variant="primary" loading={isSubmitting}>
              {submitLabel}
            </Button>
          </InlineStack>
        </BlockStack>
      </Form>
    </Page>
  );
}
