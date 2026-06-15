import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { listSubscriptionsForAdmin, requireAdmin } from "../services/admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);
  return { subscriptions: await listSubscriptionsForAdmin() };
}

export default function AdminSubscriptionsPage() {
  const { subscriptions } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Subscription Management</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Shop</th>
            <th align="left">Plan</th>
            <th align="left">Status</th>
            <th align="left">Price</th>
            <th align="left">Created</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub) => (
            <tr key={sub.id}>
              <td>{sub.shop.shopDomain}</td>
              <td>{sub.plan}</td>
              <td>{sub.status}</td>
              <td>${Number(sub.price).toFixed(2)}</td>
              <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
