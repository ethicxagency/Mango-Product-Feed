import { BlockStack, Card, InlineStack, Text } from "@shopify/polaris";

import type { ProductStatusCounts } from "~/repositories/product.repository.server";

interface Segment {
  key: string;
  label: string;
  value: number;
  barColor: string;
  dotColor: string;
}

export function ProductBreakdownCard({
  counts,
}: {
  counts: ProductStatusCounts;
}) {
  const total = counts.total;
  const segments: Segment[] = [
    {
      key: "active",
      label: "Active",
      value: counts.active,
      barColor: "var(--p-color-bg-fill-success)",
      dotColor: "var(--p-color-bg-fill-success)",
    },
    {
      key: "draft",
      label: "Draft",
      value: counts.draft,
      barColor: "var(--p-color-bg-fill-caution)",
      dotColor: "var(--p-color-bg-fill-caution)",
    },
    {
      key: "archived",
      label: "Archived",
      value: counts.archived,
      barColor: "var(--p-color-bg-fill-tertiary)",
      dotColor: "var(--p-color-bg-fill-tertiary)",
    },
  ];

  return (
    <Card padding="400">
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Products
        </Text>

        <div className="mango-breakdown-track">
          {total > 0 &&
            segments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <div
                  key={segment.key}
                  className="mango-breakdown-segment"
                  style={{
                    width: `${(segment.value / total) * 100}%`,
                    background: segment.barColor,
                  }}
                />
              ))}
        </div>

        <BlockStack gap="200">
          {segments.map((segment) => (
            <InlineStack
              key={segment.key}
              align="space-between"
              blockAlign="center"
            >
              <InlineStack gap="200" blockAlign="center">
                <span
                  className="mango-breakdown-dot"
                  style={{ background: segment.dotColor }}
                />
                <Text as="span" variant="bodySm">
                  {segment.label}
                </Text>
              </InlineStack>
              <Text as="span" variant="bodySm" fontWeight="semibold">
                {segment.value.toLocaleString()}
              </Text>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
