import type { LoaderFunctionArgs } from "react-router";
import { enforceRequestSecurity } from "../middleware/security.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await enforceRequestSecurity(request, { rateLimit: 30 });
  return null;
}

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1>Terms of Service</h1>
      <p>Last updated: June 15, 2025</p>
      <h2>Acceptance</h2>
      <p>
        By installing Mango Product Feed, you agree to these terms. If you do not agree, do not use the App.
      </p>
      <h2>Service Description</h2>
      <p>
        The App generates product feeds, provides feed health monitoring, optional AI optimization,
        and multi-channel export for Shopify stores.
      </p>
      <h2>Subscriptions &amp; Billing</h2>
      <p>
        Paid plans (Starter, Pro) are billed through Shopify&apos;s app billing API. Charges recur according
        to the selected plan until cancelled. Free plan features are provided as-is without SLA guarantees.
      </p>
      <h2>Acceptable Use</h2>
      <ul>
        <li>You must have rights to the product data you sync and export</li>
        <li>Do not abuse feed endpoints or attempt to bypass rate limits</li>
        <li>Do not use the App for unlawful advertising or misleading product listings</li>
      </ul>
      <h2>Limitation of Liability</h2>
      <p>
        The App is provided &quot;as is.&quot; We are not liable for ad platform disapprovals, revenue loss,
        or indirect damages arising from feed delivery issues beyond our reasonable control.
      </p>
      <h2>Termination</h2>
      <p>
        You may uninstall the App at any time. We may suspend access for abuse or non-payment on paid plans.
      </p>
    </main>
  );
}
