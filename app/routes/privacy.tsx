import type { LoaderFunctionArgs } from "react-router";
import { enforceRequestSecurity } from "../middleware/security.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await enforceRequestSecurity(request, { rateLimit: 30 });
  return null;
}

export default function PrivacyPolicyPage() {
  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1>Privacy Policy</h1>
      <p>Last updated: June 15, 2025</p>
      <h2>Overview</h2>
      <p>
        Mango Product Feed (&quot;the App&quot;) helps Shopify merchants generate and manage product feeds
        for advertising channels. This policy describes how we collect, use, and protect merchant data.
      </p>
      <h2>Data We Collect</h2>
      <ul>
        <li>Shop domain, store name, and contact email from Shopify OAuth</li>
        <li>Product catalog data synced from Shopify (titles, descriptions, prices, images, SKUs)</li>
        <li>Feed access logs (timestamps, user agents, response metrics)</li>
        <li>Billing and subscription status for paid plans</li>
      </ul>
      <h2>How We Use Data</h2>
      <ul>
        <li>Generate product feeds for Google, Meta, TikTok, Pinterest, Snapchat, and custom channels</li>
        <li>Provide feed health analytics and optional AI optimization features</li>
        <li>Send operational email alerts when configured (feed errors, expiry, sync failures)</li>
        <li>Process Shopify billing charges for subscription plans</li>
      </ul>
      <h2>Data Retention &amp; Deletion</h2>
      <p>
        Shop data is deleted when the app is uninstalled via Shopify webhooks. Feed logs and system logs
        are retained for up to 30 days unless a longer retention period is required by law.
      </p>
      <h2>Third Parties</h2>
      <p>
        Optional AI features may send product text to OpenAI when configured. Email notifications are
        delivered via your configured SMTP provider. We do not sell merchant data.
      </p>
      <h2>Contact</h2>
      <p>Questions: support@mango-feed.app</p>
    </main>
  );
}
