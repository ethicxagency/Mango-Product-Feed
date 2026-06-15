import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { Layout, Page } from "@shopify/polaris";
import { AppLayout } from "../components/AppLayout";
import { ProductForm } from "../components/ProductForm";
import {
  getProductById,
  isSkuTaken,
  updateProduct,
} from "../services/product.server";
import type { Availability } from "../types/product";
import {
  parseProductFormData,
  validateProductInput,
} from "../utils/product";

export async function loader({ params }: LoaderFunctionArgs) {
  const product = await getProductById(params.id ?? "");
  if (!product) {
    throw data("Product not found", { status: 404 });
  }
  return { product };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const id = params.id ?? "";
  const formData = await request.formData();
  const input = parseProductFormData(formData);
  const errors = validateProductInput(input);

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  if (await isSkuTaken(input.sku, id)) {
    return { errors: { sku: "SKU already exists" } };
  }

  await updateProduct(id, {
    ...input,
    availability: input.availability as Availability,
  });

  return redirect("/products");
}

export default function EditProductRoute() {
  const { product } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <AppLayout>
      <Page
        title={`Edit ${product.title}`}
        backAction={{ content: "Products", url: "/products" }}
      >
        <Layout>
          <Layout.Section>
            <ProductForm
              product={product}
              errors={actionData?.errors}
              submitLabel="Save changes"
            />
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}
