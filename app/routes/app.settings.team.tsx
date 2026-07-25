import {
  Badge,
  BlockStack,
  Banner,
  Card,
  Icon,
  IndexTable,
  Text,
} from "@shopify/polaris";
import { CheckIcon, XIcon } from "@shopify/polaris-icons";

import { TEAM_ROLES } from "~/types/settings";
import type { TeamRole } from "~/types/settings";

interface PermissionRow {
  permission: string;
  allowed: Record<TeamRole, boolean>;
}

const PERMISSIONS: PermissionRow[] = [
  {
    permission: "View feeds & dashboard",
    allowed: { OWNER: true, ADMIN: true, EDITOR: true, VIEWER: true },
  },
  {
    permission: "Create & edit feeds",
    allowed: { OWNER: true, ADMIN: true, EDITOR: true, VIEWER: false },
  },
  {
    permission: "Delete feeds",
    allowed: { OWNER: true, ADMIN: true, EDITOR: false, VIEWER: false },
  },
  {
    permission: "Trigger synchronization",
    allowed: { OWNER: true, ADMIN: true, EDITOR: true, VIEWER: false },
  },
  {
    permission: "Change settings",
    allowed: { OWNER: true, ADMIN: true, EDITOR: false, VIEWER: false },
  },
  {
    permission: "Manage billing",
    allowed: { OWNER: true, ADMIN: false, EDITOR: false, VIEWER: false },
  },
  {
    permission: "Manage team",
    allowed: { OWNER: true, ADMIN: false, EDITOR: false, VIEWER: false },
  },
];

export default function TeamSettingsPage() {
  return (
    <BlockStack gap="400">
      <Banner tone="info">
        Team management is coming in a future release. This page previews the
        planned roles and permissions — invitations aren&apos;t available yet,
        and every action in the app today is performed as the store owner.
      </Banner>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Roles
          </Text>
          <BlockStack gap="200">
            {TEAM_ROLES.map((role) => (
              <Badge key={role}>{role}</Badge>
            ))}
          </BlockStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            Permission matrix
          </Text>
          <IndexTable
            itemCount={PERMISSIONS.length}
            selectable={false}
            headings={[
              { title: "Permission" },
              ...TEAM_ROLES.map((role) => ({ title: role })),
            ]}
          >
            {PERMISSIONS.map((row, index) => (
              <IndexTable.Row
                id={row.permission}
                key={row.permission}
                position={index}
              >
                <IndexTable.Cell>
                  <Text as="span" fontWeight="medium">
                    {row.permission}
                  </Text>
                </IndexTable.Cell>
                {TEAM_ROLES.map((role) => (
                  <IndexTable.Cell key={role}>
                    <Icon
                      source={row.allowed[role] ? CheckIcon : XIcon}
                      tone={row.allowed[role] ? "success" : "subdued"}
                    />
                  </IndexTable.Cell>
                ))}
              </IndexTable.Row>
            ))}
          </IndexTable>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
