import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Frame } from "@shopify/polaris";
import {
  CreditCardIcon,
  HomeIcon,
  ListBulletedIcon,
} from "@shopify/polaris-icons";
import { boundary } from "@shopify/shopify-app-remix/server";
import { Outlet, useLocation, useRouteError } from "@remix-run/react";

import { SidebarFooter } from "~/components/sidebar/SidebarFooter";
import { SidebarHeader } from "~/components/sidebar/SidebarHeader";
import { SidebarNavItem } from "~/components/sidebar/SidebarNavItem";
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
        <div className="mango-sidebar">
          <SidebarHeader />
          <nav className="mango-sidebar-nav" aria-label="Primary">
            <SidebarNavItem
              url="/app"
              label="Dashboard"
              icon={HomeIcon}
              selected={location.pathname === "/app"}
            />
            <SidebarNavItem
              url="/app/feeds"
              label="Feeds"
              icon={ListBulletedIcon}
              selected={location.pathname.startsWith("/app/feeds")}
            />
            <SidebarNavItem
              url="/app/plans"
              label="Plans"
              icon={CreditCardIcon}
              selected={location.pathname.startsWith("/app/plans")}
            />
          </nav>
          <SidebarFooter />
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
