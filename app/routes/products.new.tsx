import {
  redirect,
  useActionData,
  type ActionFunctionArgs,
} from "react-router";
import { Layout, Page } from "@shopify/polaris";
import { AppLayout } from "../components/AppLayout";
import { ProductForm } from "../components/ProductForm";
import { createProduct, isSkuTaken } from "../services/product.server";
import type { Availability } from "../types/product";
import {
  parseProductFormData,
  validateProductInput,
} from "../utils/product";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const input = parseProductFormData(formData);
  const errors = validateProductInput(input);

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  if (await isSkuTaken(input.sku)) {
    return { errors: { sku: "SKU already exists" } };
  }

  await createProduct({
    ...input,
    availability: input.availability as Availability,
  });

  return redirect("/products");
}

export default function NewProductRoute() {
  const actionData = useActionData<typeof action>();

  return (
    <AppLayout>
      <Page
        title="Add product"
        backAction={{ content: "Products", url: "/products" }}
      >
        <Layout>
          <Layout.Section>
            <ProductForm errors={actionData?.errors} submitLabel="Create product" />
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}
