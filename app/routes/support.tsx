import type { LoaderFunctionArgs } from "react-router";
import { enforceRequestSecurity } from "../middleware/security.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await enforceRequestSecurity(request, { rateLimit: 30 });
  return null;
}

export default function SupportPage() {
  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1>Support</h1>
      <h2>Contact</h2>
      <p>Email: <a href="mailto:support@mango-feed.app">support@mango-feed.app</a></p>
      <h2>Documentation</h2>
      <ul>
        <li>Deployment guide: see <code>docs/DEPLOYMENT.md</code> in the repository</li>
        <li>Environment variables: see <code>docs/ENVIRONMENT.md</code></li>
        <li>App Store checklist: see <code>docs/APP_STORE_CHECKLIST.md</code></li>
      </ul>
      <h2>Common Issues</h2>
      <ul>
        <li><strong>Feed returns 401:</strong> Enable secret tokens in Settings and append <code>?token=...</code></li>
        <li><strong>Missing products:</strong> Run a manual sync from the Sync page or check exclusion rules</li>
        <li><strong>Category errors:</strong> Configure category mappings for your target channel</li>
        <li><strong>AI features unavailable:</strong> Set <code>OPENAI_API_KEY</code> in environment variables</li>
      </ul>
      <h2>Response Times</h2>
      <p>We aim to respond to support requests within 2 business days.</p>
    </main>
  );
}
