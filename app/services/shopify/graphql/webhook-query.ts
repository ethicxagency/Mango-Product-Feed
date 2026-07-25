export const WEBHOOK_SUBSCRIPTIONS_QUERY = `#graphql
  query RegisteredWebhooks {
    webhookSubscriptions(first: 50) {
      edges {
        node {
          id
          topic
          callbackUrl
          createdAt
          apiVersion {
            handle
          }
        }
      }
    }
  }
`;

export interface WebhookSubscriptionNode {
  id: string;
  topic: string;
  callbackUrl: string;
  createdAt: string;
  apiVersion: { handle: string };
}

export interface WebhookSubscriptionsQueryResponse {
  data: {
    webhookSubscriptions: {
      edges: { node: WebhookSubscriptionNode }[];
    };
  };
}
