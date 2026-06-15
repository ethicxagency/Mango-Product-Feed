import { AppProvider, Frame, Navigation } from "@shopify/polaris";
import {
  HomeIcon,
  ProductIcon,
  OutboundIcon,
  ChartVerticalIcon,
  ListBulletedIcon,
  SettingsIcon,
  WrenchIcon,
} from "@shopify/polaris-icons";
import enTranslations from "@shopify/polaris/locales/en.json";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

interface AppLayoutProps {
  children: ReactNode;
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
    <Link to={url ?? "/"} {...rest}>
      {children}
    </Link>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const navigation = (
    <Navigation location={pathname}>
      <Navigation.Section
        items={[
          {
            url: "/",
            label: "Dashboard",
            icon: HomeIcon,
            selected: pathname === "/",
          },
          {
            url: "/products",
            label: "Products",
            icon: ProductIcon,
            selected: pathname.startsWith("/products"),
          },
          {
            url: "/feeds",
            label: "Feed Generator",
            icon: OutboundIcon,
            selected: pathname === "/feeds",
          },
          {
            url: "/feeds/builder",
            label: "Feed Builder",
            icon: WrenchIcon,
            selected: pathname.startsWith("/feeds/builder"),
          },
          {
            url: "/feeds/analytics",
            label: "Analytics",
            icon: ChartVerticalIcon,
            selected: pathname.startsWith("/feeds/analytics"),
          },
          {
            url: "/feeds/logs",
            label: "Feed Logs",
            icon: ListBulletedIcon,
            selected: pathname.startsWith("/feeds/logs"),
          },
          {
            url: "/feeds/health",
            label: "Feed Health",
            icon: ChartVerticalIcon,
            selected: pathname.startsWith("/feeds/health"),
          },
          {
            url: "/feeds/mappings",
            label: "Category Mapping",
            icon: WrenchIcon,
            selected: pathname.startsWith("/feeds/mappings"),
          },
          {
            url: "/ai",
            label: "AI Tools",
            icon: ChartVerticalIcon,
            selected: pathname.startsWith("/ai"),
          },
          {
            url: "/settings",
            label: "Settings",
            icon: SettingsIcon,
            selected: pathname.startsWith("/settings"),
          },
        ]}
      />
    </Navigation>
  );

  return (
    <AppProvider
      i18n={enTranslations}
      linkComponent={PolarisLink as never}
    >
      <Frame navigation={navigation}>{children}</Frame>
    </AppProvider>
  );
}
