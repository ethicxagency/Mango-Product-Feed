import { useState } from "react";
import {
  BlockStack,
  Button,
  Card,
  Checkbox,
  FormLayout,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import type { FeedRule } from "@prisma/client";
import {
  RULE_ACTION_LABELS,
  RULE_FIELD_LABELS,
  RULE_OPERATOR_LABELS,
  type FeedRuleInput,
} from "../types/feed";
import { describeRule } from "../utils/feed";

interface FeedRulesEditorProps {
  rules: FeedRule[];
  onChange: (rules: FeedRule[]) => void;
}

function createEmptyRule(): FeedRule {
  return {
    id: `temp-${crypto.randomUUID()}`,
    feedConfigId: "",
    name: "New rule",
    conditionField: "STOCK",
    conditionOperator: "EQ",
    conditionValue: "0",
    action: "EXCLUDE",
    actionValue: null,
    priority: 0,
    isActive: true,
    createdAt: new Date(),
  };
}

export function FeedRulesEditor({ rules, onChange }: FeedRulesEditorProps) {
  const [draft, setDraft] = useState<FeedRuleInput>({
    name: "Exclude out of stock products",
    conditionField: "STOCK",
    conditionOperator: "EQ",
    conditionValue: "0",
    action: "EXCLUDE",
    actionValue: "",
    priority: rules.length,
    isActive: true,
  });

  const addRule = () => {
    const nextRule = createEmptyRule();
    onChange([
      ...rules,
      {
        ...nextRule,
        ...draft,
        actionValue: draft.actionValue || null,
      },
    ]);
    setDraft((current) => ({
      ...current,
      name: "New rule",
      priority: rules.length + 1,
    }));
  };

  const removeRule = (id: string) => {
    onChange(rules.filter((rule) => rule.id !== id));
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Feed rules engine
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Build IF / THEN rules such as excluding out-of-stock products or appending custom text by category.
        </Text>

        {rules.length > 0 && (
          <BlockStack gap="200">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <InlineStack gap="200">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      {rule.name}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {describeRule(rule)}
                    </Text>
                  </BlockStack>
                  <Button tone="critical" onClick={() => removeRule(rule.id)}>
                    Remove
                  </Button>
                </InlineStack>
              </Card>
            ))}
          </BlockStack>
        )}

        <FormLayout>
          <TextField
            label="Rule name"
            value={draft.name}
            onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
            autoComplete="off"
          />
          <FormLayout.Group>
            <Select
              label="IF field"
              options={Object.entries(RULE_FIELD_LABELS).map(([value, label]) => ({
                label,
                value,
              }))}
              value={draft.conditionField}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  conditionField: value as FeedRuleInput["conditionField"],
                }))
              }
            />
            <Select
              label="Operator"
              options={Object.entries(RULE_OPERATOR_LABELS).map(([value, label]) => ({
                label,
                value,
              }))}
              value={draft.conditionOperator}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  conditionOperator: value as FeedRuleInput["conditionOperator"],
                }))
              }
            />
          </FormLayout.Group>
          <TextField
            label="Condition value"
            value={draft.conditionValue}
            onChange={(value) =>
              setDraft((current) => ({ ...current, conditionValue: value }))
            }
            autoComplete="off"
            helpText='Examples: "0" for out of stock, "Shoes" for category, "10" for price'
          />
          <FormLayout.Group>
            <Select
              label="THEN action"
              options={Object.entries(RULE_ACTION_LABELS).map(([value, label]) => ({
                label,
                value,
              }))}
              value={draft.action}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  action: value as FeedRuleInput["action"],
                }))
              }
            />
            {draft.action === "APPEND_TEXT" && (
              <TextField
                label="Custom text"
                value={draft.actionValue ?? ""}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, actionValue: value }))
                }
                autoComplete="off"
              />
            )}
          </FormLayout.Group>
          <Checkbox
            label="Rule is active"
            checked={draft.isActive}
            onChange={(checked) => setDraft((current) => ({ ...current, isActive: checked }))}
          />
        </FormLayout>

        <InlineStack gap="200">
          <Button onClick={addRule}>Add rule</Button>
        </InlineStack>
      </BlockStack>
    </Card>
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
    <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
      {children}
    </div>
  );
}
