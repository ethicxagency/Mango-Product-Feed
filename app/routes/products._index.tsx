import {
  redirect,
  useLoaderData,
  useFetcher,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  EmptyState,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { AppLayout } from "../components/AppLayout";
import { deleteProduct, listProducts } from "../services/product.server";
import { AVAILABILITY_LABELS } from "../types/product";

export async function loader(_args: LoaderFunctionArgs) {
  const products = await listProducts();
  return { products };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const id = String(formData.get("id") ?? "");

  if (intent === "delete" && id) {
    await deleteProduct(id);
  }

  return redirect("/products");
}

export default function ProductsIndexRoute() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  const rowMarkup = products.map((product, index) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      selected={selectedResources.includes(product.id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {product.title}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{product.sku}</IndexTable.Cell>
      <IndexTable.Cell>{product.brand}</IndexTable.Cell>
      <IndexTable.Cell>${String(product.price)}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge
          tone={
            product.availability === "IN_STOCK"
              ? "success"
              : product.availability === "PREORDER"
                ? "info"
                : undefined
          }
        >
          {AVAILABILITY_LABELS[product.availability]}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="200">
          <Button url={`/products/${product.id}/edit`} icon={EditIcon}>
            Edit
          </Button>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={product.id} />
            <Button
              submit
              tone="critical"
              icon={DeleteIcon}
              loading={
                fetcher.state !== "idle" &&
                fetcher.formData?.get("id") === product.id
              }
            >
              Delete
            </Button>
          </fetcher.Form>
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <AppLayout>
      <Page
        title="Products"
        primaryAction={{ content: "Add product", url: "/products/new" }}
      >
        <Layout>
          <Layout.Section>
            {products.length === 0 ? (
              <Card>
                <EmptyState
                  heading="Manage your product catalog"
                  action={{ content: "Add product", url: "/products/new" }}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Add products to generate Google, Meta, and TikTok feeds.</p>
                </EmptyState>
              </Card>
            ) : (
              <Card padding="0">
                <IndexTable
                  resourceName={{ singular: "product", plural: "products" }}
                  itemCount={products.length}
                  selectedItemsCount={
                    allResourcesSelected ? "All" : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  headings={[
                    { title: "Title" },
                    { title: "SKU" },
                    { title: "Brand" },
                    { title: "Price" },
                    { title: "Availability" },
                    { title: "Actions" },
                  ]}
                >
                  {rowMarkup}
                </IndexTable>
              </Card>
            )}
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}
