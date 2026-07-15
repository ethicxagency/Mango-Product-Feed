export const PRODUCT_SYNC_QUERY = `#graphql
  query SyncProducts($cursor: String) {
    products(first: 50, after: $cursor) {
      edges {
        cursor
        node {
          id
          title
          handle
          descriptionHtml
          vendor
          productType
          status
          publishedAt
          tags
          createdAt
          updatedAt
          seo {
            title
            description
          }
          images(first: 20) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                barcode
                price
                compareAtPrice
                taxable
                selectedOptions {
                  name
                  value
                }
                inventoryQuantity
                inventoryPolicy
                inventoryItem {
                  id
                  requiresShipping
                  measurement {
                    weight {
                      value
                      unit
                    }
                  }
                }
                image {
                  id
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const PRODUCT_BY_ID_QUERY = `#graphql
  query SyncOneProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      descriptionHtml
      vendor
      productType
      status
      publishedAt
      tags
      createdAt
      updatedAt
      seo {
        title
        description
      }
      images(first: 20) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            sku
            barcode
            price
            compareAtPrice
            taxable
            selectedOptions {
              name
              value
            }
            inventoryQuantity
            inventoryPolicy
            inventoryItem {
              id
              requiresShipping
              measurement {
                weight {
                  value
                  unit
                }
              }
            }
            image {
              id
            }
          }
        }
      }
    }
  }
`;

export interface ShopifyProductImageNode {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface ShopifyProductVariantNode {
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: string;
  compareAtPrice: string | null;
  taxable: boolean;
  selectedOptions: { name: string; value: string }[];
  inventoryQuantity: number | null;
  inventoryPolicy: "DENY" | "CONTINUE";
  inventoryItem: {
    id: string;
    requiresShipping: boolean;
    measurement: {
      weight: { value: number; unit: string } | null;
    };
  };
  image: { id: string } | null;
}

export interface ShopifyProductNode {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  publishedAt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  seo: { title: string | null; description: string | null };
  images: { edges: { node: ShopifyProductImageNode }[] };
  variants: { edges: { node: ShopifyProductVariantNode }[] };
}

export interface ProductSyncQueryResponse {
  data: {
    products: {
      edges: { cursor: string; node: ShopifyProductNode }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
}

export interface ProductByIdQueryResponse {
  data: {
    product: ShopifyProductNode | null;
  };
}
