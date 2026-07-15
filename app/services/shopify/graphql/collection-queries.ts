export const COLLECTION_SYNC_QUERY = `#graphql
  query SyncCollections($cursor: String) {
    collections(first: 50, after: $cursor) {
      edges {
        cursor
        node {
          id
          title
          handle
          description
          ruleSet {
            appliedDisjunctively
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

export const COLLECTION_BY_ID_QUERY = `#graphql
  query SyncOneCollection($id: ID!) {
    collection(id: $id) {
      id
      title
      handle
      description
      ruleSet {
        appliedDisjunctively
      }
    }
  }
`;

export const COLLECTION_PRODUCTS_QUERY = `#graphql
  query SyncCollectionProducts($id: ID!, $cursor: String) {
    collection(id: $id) {
      products(first: 250, after: $cursor) {
        edges {
          node {
            id
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export interface ShopifyCollectionNode {
  id: string;
  title: string;
  handle: string;
  description: string;
  ruleSet: { appliedDisjunctively: boolean } | null;
}

export interface CollectionSyncQueryResponse {
  data: {
    collections: {
      edges: { cursor: string; node: ShopifyCollectionNode }[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
}

export interface CollectionProductsQueryResponse {
  data: {
    collection: {
      products: {
        edges: { node: { id: string } }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } | null;
  };
}

export interface CollectionByIdQueryResponse {
  data: {
    collection: ShopifyCollectionNode | null;
  };
}
