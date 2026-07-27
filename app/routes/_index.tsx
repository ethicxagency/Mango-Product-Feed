import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

// Shopify Admin loads the app at its bare application_url with
// ?shop=...&host=...&embedded=1 appended. Those params must be forwarded
// to /app so authenticate.admin() can resolve the shop — dropping them
// (as a plain redirect("/app") would) makes every embedded launch look
// shop-less, which sends it to /auth/login instead of auto-authenticating.
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return redirect(`/app${url.search}`);
}
