import type { Product } from "@prisma/client";
import { Prisma } from "@prisma/client";

/** Static exchange rates relative to USD (extend via API in production). */
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 149.5,
  BDT: 110,
  INR: 83.1,
};

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return amount;

  const fromRate = EXCHANGE_RATES[from] ?? 1;
  const toRate = EXCHANGE_RATES[to] ?? 1;
  const usdAmount = amount / fromRate;
  return Math.round((usdAmount * toRate) * 100) / 100;
}

export function convertProductPrice(
  product: Pick<Product, "price" | "salePrice" | "currencyCode">,
  targetCurrency: string,
): { price: Product["price"]; salePrice: Product["salePrice"] } {
  const from = product.currencyCode || "USD";
  const price = convertAmount(Number(product.price), from, targetCurrency);
  const salePrice = product.salePrice
    ? convertAmount(Number(product.salePrice), from, targetCurrency)
    : null;

  return {
    price: new Prisma.Decimal(price),
    salePrice: salePrice === null ? null : new Prisma.Decimal(salePrice),
  };
}

export function getSupportedCurrencies(): string[] {
  return Object.keys(EXCHANGE_RATES).sort();
}

export function getSupportedCountries(): { code: string; name: string }[] {
  return [
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "BD", name: "Bangladesh" },
    { code: "IN", name: "India" },
    { code: "JP", name: "Japan" },
  ];
}
