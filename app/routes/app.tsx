import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Frame, Navigation, Text } from "@shopify/polaris";
import {
  CreditCardIcon,
  HomeIcon,
  ListBulletedIcon,
} from "@shopify/polaris-icons";
import { boundary } from "@shopify/shopify-app-remix/server";
import { Link, Outlet, useLocation, useRouteError } from "@remix-run/react";

import { isMockModeEnabled } from "~/lib/mock-mode.server";
import { authenticate } from "~/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Every route under /app is embedded admin UI — this is the one place
  // that gates the whole section behind a real Shopify session. Local dev
  // and the existing e2e/integration suites run with MOCK_SHOPIFY=true and
  // never had a real session to begin with, so they skip this check
  // entirely rather than being redirected into a real OAuth flow.
  if (!isMockModeEnabled()) {
    await authenticate.admin(request);
  }
  return null;
}

export default function AppLayout() {
  const location = useLocation();

  return (
    <Frame
      logo={{
        topBarSource: "/logo.png",
        url: "/app",
        accessibilityLabel: "Mango Product Feed",
        width: 36,
      }}
      navigation={
        <div
          style={{ display: "flex", flexDirection: "column", height: "100%" }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Link
              to="/app"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--p-space-200)",
                padding:
                  "var(--p-space-400) var(--p-space-300) var(--p-space-200)",
                textDecoration: "none",
              }}
            >
              <img src="/logo.png" alt="" width={28} height={28} />
              <Text as="span" variant="headingSm">
                Mango Product Feed
              </Text>
            </Link>
            <Navigation location={location.pathname}>
              <Navigation.Section
                items={[
                  {
                    url: "/app",
                    label: "Dashboard",
                    icon: HomeIcon,
                    selected: location.pathname === "/app",
                  },
                  {
                    url: "/app/feeds",
                    label: "Feeds",
                    icon: ListBulletedIcon,
                    selected: location.pathname.startsWith("/app/feeds"),
                  },
                  {
                    url: "/app/plans",
                    label: "Plans",
                    icon: CreditCardIcon,
                    selected: location.pathname.startsWith("/app/plans"),
                  },
                ]}
              />
            </Navigation>
          </div>
          <div
            style={{
              padding: "var(--p-space-400)",
              borderTop: "1px solid var(--p-color-border-secondary)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "var(--p-space-150)",
              }}
            >
              <img src="/logo.png" alt="" width={18} height={18} />
              <Text as="p" variant="bodySm" fontWeight="medium">
                Mango Product Feed
              </Text>
            </div>
            <Text as="p" variant="bodySm" tone="subdued">
              Built by merchants, for merchants.
            </Text>
          </div>
        </div>
      }
    >
      <Outlet />
    </Frame>
  );
}

// Required so Remix forwards thrown Responses (e.g. the reauth redirect
// authenticate.admin() issues when a session expires) with their embedded
// CSP headers intact, instead of Remix's default error handling dropping
// them.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
