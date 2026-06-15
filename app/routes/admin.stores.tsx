import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { listShopsForAdmin, requireAdmin } from "../services/admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);
  return { stores: await listShopsForAdmin() };
}

export default function AdminStoresPage() {
  const { stores } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Store Management</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Domain</th>
            <th align="left">Plan</th>
            <th align="left">Sync</th>
            <th align="left">Products</th>
            <th align="left">Feeds</th>
            <th align="left">Installed</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => (
            <tr key={store.id}>
              <td>{store.shopDomain}</td>
              <td>{store.plan}</td>
              <td>{store.syncStatus}</td>
              <td>{store._count.products}</td>
              <td>{store._count.feedConfigs}</td>
              <td>{new Date(store.installedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
