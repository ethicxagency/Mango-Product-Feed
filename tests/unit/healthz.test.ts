import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
vi.mock("~/lib/db.server", () => ({ db: { $queryRaw: queryRaw } }));

async function call(url: string) {
  const { loader } = await import("~/routes/healthz");
  return loader({ request: new Request(url), params: {}, context: {} });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /healthz", () => {
  it("liveness returns 200 without touching the database", async () => {
    const res = await call("https://app.test/healthz");
    expect(res.status).toBe(200);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("deep check returns 200 when the database answers", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    const res = await call("https://app.test/healthz?deep=1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", database: "up" });
  });

  it("deep check returns a clear 503 (not a hang) when the database is unreachable", async () => {
    queryRaw.mockRejectedValue(
      new Error("Can't reach database server at `dpg-x:5432`"),
    );
    const res = await call("https://app.test/healthz?deep=1");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "unavailable", database: "down" });
    expect(res.headers.get("Retry-After")).toBe("30");
  });
});
