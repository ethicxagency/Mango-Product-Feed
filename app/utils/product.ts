export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatFeedPrice(
  price: number | string,
  currency = "USD",
): string {
  const amount =
    typeof price === "number" ? price : Number.parseFloat(String(price));
  if (Number.isNaN(amount)) return escapeXml(`${price} ${currency}`);
  return escapeXml(`${amount.toFixed(2)} ${currency}`);
}

export function toGoogleAvailability(
  availability: string,
): "in stock" | "out of stock" | "preorder" {
  switch (availability) {
    case "OUT_OF_STOCK":
      return "out of stock";
    case "PREORDER":
      return "preorder";
    default:
      return "in stock";
  }
}

export function parseProductFormData(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    gtin: String(formData.get("gtin") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    productType: String(formData.get("productType") ?? "").trim(),
    price: String(formData.get("price") ?? "").trim(),
    salePrice: String(formData.get("salePrice") ?? "").trim(),
    availability: String(formData.get("availability") ?? "IN_STOCK"),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    productUrl: String(formData.get("productUrl") ?? "").trim(),
  };
}

export function validateProductInput(input: ReturnType<typeof parseProductFormData>) {
  const errors: Record<string, string> = {};

  if (!input.title) errors.title = "Title is required";
  if (!input.description) errors.description = "Description is required";
  if (!input.sku) errors.sku = "SKU is required";
  if (!input.brand) errors.brand = "Brand is required";
  if (!input.category) errors.category = "Category is required";
  if (!input.productType) errors.productType = "Product type is required";
  if (!input.price || Number.isNaN(Number.parseFloat(input.price))) {
    errors.price = "Valid price is required";
  }
  if (
    input.salePrice &&
    Number.isNaN(Number.parseFloat(input.salePrice))
  ) {
    errors.salePrice = "Sale price must be a valid number";
  }
  if (!input.imageUrl) errors.imageUrl = "Image URL is required";
  if (!input.productUrl) errors.productUrl = "Product URL is required";

  return errors;
}

export function getAppUrl(request?: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  }
  return "http://localhost:3000";
}
