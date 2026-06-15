import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { listSystemLogs } from "../services/system-log.server";
import { requireAdmin } from "../services/admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);
  return { logs: await listSystemLogs({ limit: 200 }) };
}

export default function AdminLogsPage() {
  const { logs } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>System Logs</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            <th align="left">Time</th>
            <th align="left">Level</th>
            <th align="left">Category</th>
            <th align="left">Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.level}</td>
              <td>{log.category}</td>
              <td>{log.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
