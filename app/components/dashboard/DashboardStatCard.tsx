import { BlockStack, Card, Icon, InlineStack, Text } from "@shopify/polaris";
import type { IconSource } from "@shopify/polaris";

type StatTone = "base" | "success" | "warning" | "critical" | "info";

interface DashboardStatCardProps {
  label: string;
  value: string;
  icon: IconSource;
  tone?: StatTone;
}

const ICON_TONE: Record<StatTone, "subdued" | "success" | "warning" | "critical" | "info"> = {
  base: "subdued",
  success: "success",
  warning: "warning",
  critical: "critical",
  info: "info",
};

/**
 * Icon is wrapped in a non-flex span: Polaris's Icon component ships its own
 * `margin: auto`, which breaks alignment when placed directly inside a flex
 * row (InlineStack) — the span neutralizes that.
 */
export function DashboardStatCard({
  label,
  value,
  icon,
  tone = "base",
}: DashboardStatCardProps) {
  return (
    <Card padding="400">
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="span" tone="subdued" variant="bodySm" fontWeight="medium">
            {label}
          </Text>
          <span style={{ flexShrink: 0, display: "flex" }}>
            <Icon source={icon} tone={ICON_TONE[tone]} />
          </span>
        </InlineStack>
        <Text as="span" variant="heading2xl">
          {value}
        </Text>
      </BlockStack>
    </Card>
  );
}
