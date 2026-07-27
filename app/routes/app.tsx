import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Frame, Navigation, Text } from "@shopify/polaris";
import {
  CreditCardIcon,
  HomeIcon,
  ListBulletedIcon,
} from "@shopify/polaris-icons";
import { boundary } from "@shopify/shopify-app-remix/server";
import { Outlet, useLocation, useRouteError } from "@remix-run/react";

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
            className="mango-sidebar-footer"
            style={{
              borderTop: "1px solid var(--p-color-border-secondary)",
            }}
          >
            <img
              src="/footer-logo.png"
              alt=""
              width={36}
              height={36}
              className="mango-sidebar-footer__logo"
            />
            <div className="mango-sidebar-footer__name">
              <Text as="p" variant="bodySm" alignment="center">
                Mango Product Feed
              </Text>
            </div>
            <div className="mango-sidebar-footer__tagline">
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                Built by Nextup Global, LLC for merchants.
              </Text>
            </div>
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
