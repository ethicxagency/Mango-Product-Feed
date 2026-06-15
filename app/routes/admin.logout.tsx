import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { clearAdminSessionCookie, getAdminFromSession } from "../services/admin.server";
import prisma from "../db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await getAdminFromSession(request);
  if (admin) {
    const cookie = request.headers.get("Cookie") ?? "";
    const match = cookie.match(/mango_admin_session=([^;]+)/);
    if (match?.[1]) {
      await prisma.appSetting.deleteMany({
        where: { key: `admin_session_${match[1]}` },
      });
    }
  }

  return redirect("/admin/login", {
    headers: { "Set-Cookie": clearAdminSessionCookie() },
  });
}
