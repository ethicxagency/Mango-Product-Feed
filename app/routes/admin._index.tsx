import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const [shops, products, feeds, subscriptions, logs] = await Promise.all([
    prisma.shop.count(),
    prisma.product.count(),
    prisma.feedConfig.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.systemLog.count({ where: { level: "ERROR" } }),
  ]);

  return { shops, products, feeds, subscriptions, errorLogs: logs };
}

export default function AdminDashboard() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>System Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        <StatCard label="Stores" value={data.shops} />
        <StatCard label="Products" value={data.products} />
        <StatCard label="Feeds" value={data.feeds} />
        <StatCard label="Active Subscriptions" value={data.subscriptions} />
        <StatCard label="Error Logs" value={data.errorLogs} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
