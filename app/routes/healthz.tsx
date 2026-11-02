import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { db } from "~/lib/db.server";

/** Unauthenticated health endpoint for Render / uptime checks.
 *  GET /healthz        -> liveness (process is serving requests)
 *  GET /healthz?deep=1 -> also verifies the database answers a trivial query,
 *                         returning 503 with a clear reason when it doesn't. */
export async function loader({ request }: LoaderFunctionArgs) {
  const deep = new URL(request.url).searchParams.get("deep") === "1";

  if (!deep) {
    return json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    await db.$queryRaw`SELECT 1`;
    return json(
      { status: "ok", database: "up" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[healthz] database check failed:",
      error instanceof Error ? error.message.split("\n")[0] : "unknown error",
    );
    return json(
      { status: "unavailable", database: "down" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
}
