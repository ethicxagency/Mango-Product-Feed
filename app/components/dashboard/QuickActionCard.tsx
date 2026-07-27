import { BlockStack, Icon, Text } from "@shopify/polaris";
import type { IconSource } from "@shopify/polaris";
import { Link } from "@remix-run/react";

interface QuickActionCardProps {
  icon: IconSource;
  title: string;
  description: string;
  url: string;
}

export function QuickActionCard({
  icon,
  title,
  description,
  url,
}: QuickActionCardProps) {
  return (
    <Link to={url} className="mango-quick-action" aria-label={title}>
      <BlockStack gap="300">
        <span className="mango-quick-action__icon">
          <Icon source={icon} tone="base" />
        </span>
        <BlockStack gap="100">
          <Text as="h3" variant="headingSm">
            {title}
          </Text>
          <Text as="span" tone="subdued" variant="bodySm">
            {description}
          </Text>
        </BlockStack>
      </BlockStack>
    </Link>
  );
}
