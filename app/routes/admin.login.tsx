import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useActionData } from "react-router";
import {
  authenticateAdmin,
  createAdminSessionCookie,
  ensureDefaultAdmin,
} from "../services/admin.server";
import { adminLoginSchema, formatZodErrors } from "../utils/validation.server";
import { enforceRequestSecurity } from "../middleware/security.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await enforceRequestSecurity(request, { rateLimit: 10, rateLimitKey: "admin:login" });
  await ensureDefaultAdmin();
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  await enforceRequestSecurity(request, { rateLimit: 5, rateLimitKey: "admin:login:post" });
  const formData = await request.formData();
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: formatZodErrors(parsed.error) };
  }

  const session = await authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!session) {
    return { errors: { form: "Invalid email or password" } };
  }

  return redirect("/admin", {
    headers: {
      "Set-Cookie": createAdminSessionCookie(session.token, session.expires),
    },
  });
}

export default function AdminLoginPage() {
  const actionData = useActionData<typeof action>();

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Admin Login</h1>
      {actionData?.errors?.form ? <p style={{ color: "crimson" }}>{actionData.errors.form}</p> : null}
      <Form method="post" style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input name="email" type="email" required style={{ display: "block", width: "100%" }} />
        </label>
        <label>
          Password
          <input name="password" type="password" required style={{ display: "block", width: "100%" }} />
        </label>
        <button type="submit">Sign in</button>
      </Form>
    </main>
  );
}
