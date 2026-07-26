import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Button, Card, FormLayout, Page, Text, TextField } from "@shopify/polaris";
import { LoginErrorType } from "@shopify/shopify-app-remix/server";

import { login } from "~/shopify.server";

// Shopify's library treats authPathPrefix + "/login" ("/auth/login" here)
// as a reserved route: the non-embedded "enter your shop domain" entry
// point into OAuth, handled by calling login() rather than
// authenticate.admin(). Without this dedicated route, the auth.$.tsx
// catch-all was matching /auth/login and calling authenticate.admin()
// there instead, which the library explicitly rejects.
function errorMessage(type?: LoginErrorType): string | undefined {
  switch (type) {
    case LoginErrorType.MissingShop:
      return "Please enter your shop domain to log in";
    case LoginErrorType.InvalidShop:
      return "Please enter a valid shop domain to log in";
    default:
      return undefined;
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const errors = await login(request);
  return json({ errors: { shop: errorMessage(errors.shop) } });
}

export async function action({ request }: ActionFunctionArgs) {
  const errors = await login(request);
  return json({ errors: { shop: errorMessage(errors.shop) } });
}

export default function AuthLogin() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const errors = actionData?.errors ?? loaderData.errors;

  return (
    <Page narrowWidth>
      <Card>
        <Form method="post">
          <FormLayout>
            <Text variant="headingLg" as="h1">
              Log in
            </Text>
            <TextField
              type="text"
              name="shop"
              label="Shop domain"
              helpText="example.myshopify.com"
              value={shop}
              onChange={setShop}
              autoComplete="on"
              error={errors.shop}
            />
            <Button submit variant="primary">
              Log in
            </Button>
          </FormLayout>
        </Form>
      </Card>
    </Page>
  );
}
