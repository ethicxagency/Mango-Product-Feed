import {
  Badge,
  BlockStack,
  Card,
  DataTable,
  Text,
} from "@shopify/polaris";
import type { FeedHealthReport } from "../types/product";

interface HealthIssuesListProps {
  report: FeedHealthReport;
}

const ISSUE_LABELS = {
  MISSING_IMAGE: "Missing image",
  MISSING_SKU: "Missing SKU",
  MISSING_BRAND: "Missing brand",
  MISSING_PRICE: "Missing price",
  MISSING_PRODUCT_URL: "Missing product URL",
  MISSING_GTIN: "Missing GTIN",
  MISSING_MPN: "Missing MPN",
  DUPLICATE_SKU: "Duplicate SKU",
  BROKEN_IMAGE_URL: "Broken image URL",
} as const;

export function HealthIssuesList({ report }: HealthIssuesListProps) {
  const rows = report.issues.map((issue) => [
    issue.productTitle,
    issue.sku || "—",
    ISSUE_LABELS[issue.issue],
    issue.message,
  ]);

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Feed health summary
          </Text>
          <InlineStack gap="200">
            <Badge tone={report.score >= 80 ? "success" : report.score >= 50 ? "warning" : "critical"}>
              {`${report.score}% health score`}
            </Badge>
            <Text as="span" variant="bodyMd">
              {`${report.healthyProducts} of ${report.totalProducts} products are healthy`}
            </Text>
          </InlineStack>
        </BlockStack>
      </Card>

      {rows.length > 0 ? (
        <Card>
          <DataTable
            columnContentTypes={["text", "text", "text", "text"]}
            headings={["Product", "SKU", "Issue", "Details"]}
            rows={rows}
          />
        </Card>
      ) : (
        <Card>
          <Text as="p" variant="bodyMd">
            All products pass feed health checks.
          </Text>
        </Card>
      )}
    </BlockStack>
  );
}

function InlineStack({
  gap,
  children,
}: {
  gap: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      {children}
    </div>
  );
}
