export const SHOP_INFO_QUERY = `#graphql
  query ShopInfo {
    shop {
      name
      email
      currencyCode
      ianaTimezone
    }
  }
`;

export interface ShopInfoQueryResponse {
  data: {
    shop: {
      name: string;
      email: string | null;
      currencyCode: string;
      ianaTimezone: string;
    };
  };
}
