import type { LoaderFunctionArgs } from "react-router";
import { Link, Outlet, useLoaderData, useLocation } from "react-router";
import { requireAdmin } from "../services/admin.server";

const PUBLIC_PATHS = ["/admin/login", "/admin/logout"];

export async function loader({ request }: LoaderFunctionArgs) {
  const pathname = new URL(request.url).pathname;
  if (PUBLIC_PATHS.includes(pathname)) {
    return { admin: null, isPublic: true };
  }

  const admin = await requireAdmin(request);
  return {
    admin: { name: admin.name, email: admin.email, role: admin.role },
    isPublic: false,
  };
}

export default function AdminLayout() {
  const data = useLoaderData<typeof loader>();
  const location = useLocation();

  if (data.isPublic || !data.admin) {
    return <Outlet />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui" }}>
      <aside style={{ width: 220, background: "#111827", color: "#fff", padding: "1.5rem 1rem" }}>
        <h2 style={{ marginTop: 0 }}>Admin</h2>
        <p style={{ fontSize: 12, opacity: 0.8 }}>{data.admin.email}</p>
        <nav style={{ display: "grid", gap: 8, marginTop: 24 }}>
          <Link to="/admin" style={{ color: "#fff" }}>Dashboard</Link>
          <Link to="/admin/users" style={{ color: "#fff" }}>Users</Link>
          <Link to="/admin/stores" style={{ color: "#fff" }}>Stores</Link>
          <Link to="/admin/subscriptions" style={{ color: "#fff" }}>Subscriptions</Link>
          <Link to="/admin/logs" style={{ color: "#fff" }}>System Logs</Link>
          <Link to="/admin/logout" style={{ color: "#fff" }}>Logout</Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "2rem" }}>
        <Outlet key={location.pathname} />
      </main>
    </div>
  );
}
