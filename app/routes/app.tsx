import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Banner, Button, Frame, Navigation, Page, Text } from "@shopify/polaris";
import {
  CreditCardIcon,
  HomeIcon,
  ListBulletedIcon,
} from "@shopify/polaris-icons";
import { boundary } from "@shopify/shopify-app-remix/server";
import {
  isRouteErrorResponse,
  Outlet,
  useLocation,
  useRouteError,
} from "@remix-run/react";

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
//
// Only genuine route/Response errors go to Shopify's boundary — it re-throws
// anything else (e.g. a Prisma P1001 when the database is down), which used
// to leave the merchant on a blank/"Application Error" page. Those now get a
// clear, retryable message instead.
export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return boundary.error(error);
  }

  return (
    <Page title="Something went wrong">
      <Banner tone="critical" title="We couldn't load this page">
        <p>
          The app hit a temporary problem (for example, a database or network
          interruption). Your data is safe. Please try again in a moment.
        </p>
        <div style={{ marginTop: "var(--p-space-300)" }}>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </Banner>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
