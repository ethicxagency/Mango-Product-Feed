import type { FeedRule } from "@prisma/client";
import {
  RULE_ACTION_LABELS,
  RULE_FIELD_LABELS,
  RULE_OPERATOR_LABELS,
} from "../types/feed";

export function describeRule(rule: Pick<
  FeedRule,
  "conditionField" | "conditionOperator" | "conditionValue" | "action" | "actionValue"
>): string {
  const field = RULE_FIELD_LABELS[rule.conditionField];
  const operator = RULE_OPERATOR_LABELS[rule.conditionOperator];
  const action = RULE_ACTION_LABELS[rule.action];
  return `IF ${field} ${operator} ${rule.conditionValue} THEN ${action}${rule.actionValue ? ` "${rule.actionValue}"` : ""}`;
}

export function parseFeedRulesJson(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseFeedConfigFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    feedType: String(formData.get("feedType") ?? "GOOGLE"),
    filterMode: String(formData.get("filterMode") ?? "ALL"),
    filterValues: String(formData.get("filterValues") ?? "[]"),
    schedule: String(formData.get("schedule") ?? "MANUAL"),
    isActive: String(formData.get("isActive") ?? "true") === "true",
    rules: String(formData.get("rules") ?? "[]"),
  };
}
