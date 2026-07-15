import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-remix/react";
import type { LinksFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

import appStyles from "~/app.css?url";
import { isMockModeEnabled } from "~/lib/mock-mode.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: appStyles },
];

export async function loader() {
  return json({
    apiKey: process.env.SHOPIFY_API_KEY ?? "",
    mockMode: isMockModeEnabled(),
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Mango Product Feed</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { apiKey, mockMode } = useLoaderData<typeof loader>();

  // Mock mode (local dev without Shopify credentials yet, and the existing
  // test suites) has no real embedded session or App Bridge to attach to,
  // so it renders with plain Polaris. Once real credentials are configured,
  // the Shopify-aware provider takes over and injects App Bridge.
  if (mockMode || !apiKey) {
    return (
      <PolarisAppProvider i18n={polarisTranslations}>
        <Outlet />
      </PolarisAppProvider>
    );
  }

  return (
    <ShopifyAppProvider
      isEmbeddedApp
      apiKey={apiKey}
      i18n={polarisTranslations}
    >
      <Outlet />
    </ShopifyAppProvider>
  );
}
