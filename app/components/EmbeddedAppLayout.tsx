import { NavMenu } from "@shopify/app-bridge-react";
import { AppProvider, Frame } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

interface EmbeddedAppLayoutProps {
  children: ReactNode;
  apiKey: string;
}

function PolarisLink({
  children,
  url,
  ...rest
}: {
  children?: ReactNode;
  url?: string;
  [key: string]: unknown;
}) {
  return (
    <Link to={url ?? "/app"} {...rest}>
      {children}
    </Link>
  );
}

export function EmbeddedAppLayout({ children, apiKey }: EmbeddedAppLayoutProps) {
  useLocation();

  return (
    <AppProvider i18n={enTranslations} linkComponent={PolarisLink as never}>
      <NavMenu>
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        <Link to="/app/products">Products</Link>
        <Link to="/app/feeds">Feed Generator</Link>
        <Link to="/app/feeds/builder">Feed Builder</Link>
        <Link to="/app/feeds/analytics">Analytics</Link>
        <Link to="/app/feeds/logs">Feed Logs</Link>
        <Link to="/app/feeds/health">Feed Health</Link>
        <Link to="/app/sync">Product Sync</Link>
        <Link to="/app/billing">Billing</Link>
        <Link to="/app/settings">Settings</Link>
      </NavMenu>
      <Frame>{children}</Frame>
    </AppProvider>
  );
}
