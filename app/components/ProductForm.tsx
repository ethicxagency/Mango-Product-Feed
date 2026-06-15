import { useState } from "react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  FormLayout,
  InlineStack,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import type { Product } from "@prisma/client";
import { Form, useNavigation } from "react-router";
import {
  AVAILABILITY_OPTIONS,
  type Availability,
  type ProductInput,
} from "../types/product";

interface ProductFormProps {
  product?: Product;
  errors?: Record<string, string>;
  submitLabel?: string;
}

function productToDefaults(product?: Product): ProductInput {
  if (!product) {
    return {
      title: "",
      description: "",
      sku: "",
      gtin: "",
      brand: "",
      category: "",
      productType: "",
      price: "",
      salePrice: "",
      availability: "IN_STOCK",
      imageUrl: "",
      productUrl: "",
    };
  }

  return {
    title: product.title,
    description: product.description,
    sku: product.sku,
    gtin: product.gtin ?? "",
    brand: product.brand,
    category: product.category,
    productType: product.productType,
    price: String(product.price),
    salePrice: product.salePrice ? String(product.salePrice) : "",
    availability: product.availability,
    imageUrl: product.imageUrl,
    productUrl: product.productUrl,
  };
}

export function ProductForm({
  product,
  errors = {},
  submitLabel = "Save product",
}: ProductFormProps) {
  const navigation = useNavigation();
  const defaults = productToDefaults(product);
  const [formState, setFormState] = useState(defaults);
  const isSubmitting = navigation.state === "submitting";

  const updateField = (field: keyof ProductInput) => (value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  return (
    <Form method="post">
      <BlockStack gap="400">
        {errors.form && (
          <Banner tone="critical" title="Unable to save product">
            <p>{errors.form}</p>
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Product details
            </Text>
            <FormLayout>
              <TextField
                label="Title"
                name="title"
                autoComplete="off"
                value={formState.title}
                onChange={updateField("title")}
                error={errors.title}
              />
              <TextField
                label="Description"
                name="description"
                multiline={4}
                autoComplete="off"
                value={formState.description}
                onChange={updateField("description")}
                error={errors.description}
              />
              <FormLayout.Group>
                <TextField
                  label="SKU"
                  name="sku"
                  autoComplete="off"
                  value={formState.sku}
                  onChange={updateField("sku")}
                  error={errors.sku}
                />
                <TextField
                  label="Brand"
                  name="brand"
                  autoComplete="off"
                  value={formState.brand}
                  onChange={updateField("brand")}
                  error={errors.brand}
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField
                  label="GTIN"
                  name="gtin"
                  autoComplete="off"
                  value={formState.gtin ?? ""}
                  onChange={updateField("gtin")}
                  error={errors.gtin}
                  helpText="Optional global trade item number"
                />
                <TextField
                  label="Category"
                  name="category"
                  autoComplete="off"
                  value={formState.category}
                  onChange={updateField("category")}
                  error={errors.category}
                />
                <TextField
                  label="Product type"
                  name="productType"
                  autoComplete="off"
                  value={formState.productType}
                  onChange={updateField("productType")}
                  error={errors.productType}
                />
              </FormLayout.Group>
              <FormLayout.Group>
                <TextField
                  label="Price"
                  name="price"
                  type="number"
                  prefix="$"
                  autoComplete="off"
                  value={formState.price}
                  onChange={updateField("price")}
                  error={errors.price}
                />
                <TextField
                  label="Sale price"
                  name="salePrice"
                  type="number"
                  prefix="$"
                  autoComplete="off"
                  value={formState.salePrice}
                  onChange={updateField("salePrice")}
                  error={errors.salePrice}
                  helpText="Optional promotional price"
                />
              </FormLayout.Group>
              <Select
                label="Availability"
                options={AVAILABILITY_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                value={formState.availability}
                onChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    availability: value as Availability,
                  }))
                }
              />
              <input
                type="hidden"
                name="availability"
                value={formState.availability}
              />
              <TextField
                label="Image URL"
                name="imageUrl"
                autoComplete="off"
                value={formState.imageUrl}
                onChange={updateField("imageUrl")}
                error={errors.imageUrl}
              />
              <TextField
                label="Product URL"
                name="productUrl"
                autoComplete="off"
                value={formState.productUrl}
                onChange={updateField("productUrl")}
                error={errors.productUrl}
              />
            </FormLayout>
          </BlockStack>
        </Card>

        <InlineStack align="end">
          <Button submit variant="primary" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </InlineStack>
      </BlockStack>
    </Form>
  );
}
