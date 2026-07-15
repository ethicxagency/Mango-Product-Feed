import type { LoaderFunctionArgs } from "@remix-run/node";
import { Frame, Navigation } from "@shopify/polaris";
import { HomeIcon, ListBulletedIcon } from "@shopify/polaris-icons";
import { Outlet, useLocation } from "@remix-run/react";

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
      navigation={
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
            ]}
          />
        </Navigation>
      }
    >
      <Outlet />
    </Frame>
  );
}
