import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import {
  createAdminUser,
  listAdminUsers,
  requireAdmin,
  updateAdminUser,
} from "../services/admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request, ["SUPER_ADMIN", "ADMIN"]);
  return { users: await listAdminUsers() };
}

export async function action({ request }: ActionFunctionArgs) {
  await requireAdmin(request, ["SUPER_ADMIN"]);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create") {
    await createAdminUser({
      email: String(formData.get("email")),
      name: String(formData.get("name")),
      password: String(formData.get("password")),
      role: String(formData.get("role")) as "ADMIN" | "VIEWER" | "SUPER_ADMIN",
    });
  }

  if (intent === "toggle") {
    await updateAdminUser(String(formData.get("id")), {
      isActive: formData.get("isActive") === "true",
    });
  }

  return { ok: true };
}

export default function AdminUsersPage() {
  const { users } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>User Management</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Email</th>
            <th align="left">Role</th>
            <th align="left">Active</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <Form method="post">
                  <input type="hidden" name="intent" value="toggle" />
                  <input type="hidden" name="id" value={user.id} />
                  <input type="hidden" name="isActive" value={String(!user.isActive)} />
                  <button type="submit">{user.isActive ? "Deactivate" : "Activate"}</button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Create Admin User</h2>
      <Form method="post" style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <input type="hidden" name="intent" value="create" />
        <input name="name" placeholder="Name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <select name="role" defaultValue="ADMIN">
          <option value="ADMIN">Admin</option>
          <option value="VIEWER">Viewer</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <button type="submit">Create user</button>
      </Form>
    </div>
  );
}
