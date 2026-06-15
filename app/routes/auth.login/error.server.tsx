import type { LoginError } from "@shopify/shopify-app-react-router/server";

interface LoginErrorMessage {
  shop?: string;
}

export function loginErrorMessage(loginErrors: LoginError): LoginErrorMessage {
  const shopError = loginErrors?.shop;
  if (shopError && String(shopError).includes("Missing")) {
    return { shop: "Please enter your shop domain to log in" };
  }
  if (shopError && String(shopError).includes("Invalid")) {
    return { shop: "Please enter a valid shop domain to log in" };
  }
  return {};
}
