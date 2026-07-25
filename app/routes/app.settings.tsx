import { Link as RemixLink, Outlet, useLocation } from "@remix-run/react";
import { Box, Card, Page, Text } from "@shopify/polaris";

import { SETTINGS_SECTIONS } from "~/types/settings";

function SettingsNav() {
  const location = useLocation();

  return (
    <Card padding="0">
      <nav aria-label="Settings sections">
        {SETTINGS_SECTIONS.map((section) => {
          const href = `/app/settings/${section.path}`;
          const active =
            location.pathname === href ||
            (section.path === "general" &&
              location.pathname === "/app/settings");

          return (
            <Box
              key={section.path}
              padding="300"
              background={active ? "bg-surface-active" : undefined}
              borderInlineStartWidth={active ? "050" : undefined}
              borderColor={active ? "border-emphasis" : undefined}
            >
              <RemixLink
                to={href}
                style={{ textDecoration: "none", display: "block" }}
              >
                <Text
                  as="span"
                  fontWeight={active ? "semibold" : "regular"}
                  tone={active ? undefined : "subdued"}
                >
                  {section.label}
                </Text>
              </RemixLink>
            </Box>
          );
        })}
      </nav>
    </Card>
  );
}

export default function SettingsLayout() {
  return (
    <Page title="Settings" fullWidth>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: "var(--p-space-400)",
          alignItems: "start",
        }}
        className="settings-layout"
      >
        <SettingsNav />
        <div style={{ minWidth: 0 }}>
          <Outlet />
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .settings-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Page>
  );
}
