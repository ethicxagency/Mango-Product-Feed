import { Text } from "@shopify/polaris";

/** Compact top branding — logo + app name only, no tagline, so it never
 * dominates the sidebar above the navigation. */
export function SidebarHeader() {
  return (
    <div className="mango-sidebar-header">
      <img src="/logo.png" alt="" width={32} height={32} />
      <Text as="span" variant="headingSm" fontWeight="semibold">
        Mango Product Feed
      </Text>
    </div>
  );
}
