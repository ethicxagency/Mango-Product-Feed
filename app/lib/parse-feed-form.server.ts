import { feedFormSchema } from "~/types/feed-form";
import type { FeedFormInput } from "~/types/feed-form";

export interface ParseFeedFormResult {
  success: boolean;
  data?: FeedFormInput;
  error?: string;
}

export function parseFeedForm(formData: FormData): ParseFeedFormResult {
  const raw = {
    name: formData.get("name")?.toString() ?? "",
    channel: formData.get("channel")?.toString() ?? "",
    rootNode: formData.get("rootNode")?.toString() || "feed",
    itemNode: formData.get("itemNode")?.toString() || "item",
    prettyPrint: formData.get("prettyPrint") === "true",
    useCdata: formData.get("useCdata") === "true",

    productSelectionType:
      formData.get("productSelectionType")?.toString() ?? "ALL",
    collectionIds: formData.getAll("collectionIds").map(String),
    tagIds: formData.getAll("tagIds").map(String),
    vendors: formData.getAll("vendors").map(String),
    productTypes: formData.getAll("productTypes").map(String),
    manualProductIds: formData.getAll("manualProductIds").map(String),

    includeOutOfStock: formData.get("includeOutOfStock") === "true",
    includeVariants: formData.get("includeVariants") === "true",
    includeWithoutGtin: formData.get("includeWithoutGtin") === "true",
    includeWithoutSku: formData.get("includeWithoutSku") === "true",
    skipDuplicateProducts: formData.get("skipDuplicateProducts") === "true",
    skipDuplicateVariants: formData.get("skipDuplicateVariants") === "true",
    skipBrokenImages: formData.get("skipBrokenImages") === "true",
    onlyPublished: formData.get("onlyPublished") === "true",
    onlyActive: formData.get("onlyActive") === "true",

    priceMin: formData.get("priceMin")?.toString() ?? "",
    priceMax: formData.get("priceMax")?.toString() ?? "",
    createdAfter: formData.get("createdAfter")?.toString() ?? "",
    createdBefore: formData.get("createdBefore")?.toString() ?? "",
    updatedAfter: formData.get("updatedAfter")?.toString() ?? "",
    updatedBefore: formData.get("updatedBefore")?.toString() ?? "",
  };

  const parsed = feedFormSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  return { success: true, data: parsed.data };
}
