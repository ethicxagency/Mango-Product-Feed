import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export default function AuthLoginRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors ?? loaderData.errors;

  return (
    <AppProvider i18n={enTranslations}>
      <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 20px" }}>
        <h1>Mango Product Feed</h1>
        <p>Log in with your shop domain to continue.</p>
        <Form method="post">
          <label>
            Shop domain
            <input type="text" name="shop" placeholder="your-shop.myshopify.com" />
          </label>
          {errors?.shop && <p style={{ color: "red" }}>{errors.shop}</p>}
          <button type="submit">Log in</button>
        </Form>
      </div>
    </AppProvider>
  );
}
