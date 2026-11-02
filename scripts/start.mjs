// Production entrypoint (npm start).
//
// Previously: `prisma migrate deploy && remix-serve ...`. If the database
// was unreachable (P1001) the migrate step exited non-zero, remix-serve never
// started, and Render crash-looped the container — every request (including
// Shopify's install/review traffic) hung or failed with no explanation.
//
// Now:
//   1. Run `prisma migrate deploy`, retrying transient failures.
//   2. NEVER start the app against an unmigrated/unknown schema — migrations
//      are not skipped.
//   3. While migrations can't be applied, stay alive and answer every request
//      with a clear 503 explaining the database problem (no crash loop, no
//      silent infinite loading), and keep retrying in the background.
//   4. As soon as migrations succeed, hand the port to remix-serve.

import { spawn, spawnSync } from "node:child_process";
import http from "node:http";

const PORT = Number(process.env.PORT ?? 3000);
const MAX_QUICK_ATTEMPTS = 5;
const QUICK_DELAY_MS = 5_000;
const BACKGROUND_RETRY_MS = 30_000;

/** Strip anything that looks like a connection string/password from output. */
function redact(text) {
  return String(text).replace(/postgres(ql)?:\/\/[^\s'"]+/gi, "postgresql://[redacted]");
}

function log(message) {
  console.log(`[start] ${message}`);
}

function runMigrations() {
  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    env: process.env,
  });
  const output = redact(`${result.stdout ?? ""}${result.stderr ?? ""}`).trim();
  return { ok: result.status === 0, output };
}

function summarize(output) {
  const code = /P\d{4}/.exec(output)?.[0];
  return code ? `Prisma ${code}` : "migration failed";
}

function startApp() {
  log("migrations applied — starting remix-serve");
  const child = spawn("npx", ["remix-serve", "./build/server/index.js"], {
    stdio: "inherit",
    env: process.env,
  });
  const forward = (signal) => child.kill(signal);
  process.on("SIGTERM", () => forward("SIGTERM"));
  process.on("SIGINT", () => forward("SIGINT"));
  child.on("exit", (code) => process.exit(code ?? 1));
}

function serveUnavailable(state) {
  const server = http.createServer((req, res) => {
    const body = {
      status: "unavailable",
      reason: "database_unreachable_or_migration_failed",
      detail: state.lastSummary,
      attempts: state.attempts,
      retryingEveryMs: BACKGROUND_RETRY_MS,
    };
    res.writeHead(503, {
      "Content-Type": "application/json",
      "Retry-After": "30",
    });
    res.end(JSON.stringify(body));
  });
  server.listen(PORT, () => log(`degraded 503 responder listening on :${PORT}`));
  return server;
}

async function main() {
  const state = { attempts: 0, lastSummary: "starting" };

  for (let i = 1; i <= MAX_QUICK_ATTEMPTS; i += 1) {
    state.attempts += 1;
    const { ok, output } = runMigrations();
    if (ok) return startApp();
    state.lastSummary = summarize(output);
    log(`migration attempt ${i}/${MAX_QUICK_ATTEMPTS} failed (${state.lastSummary})`);
    console.error(output);
    if (i < MAX_QUICK_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, QUICK_DELAY_MS));
    }
  }

  log(
    "database still unavailable — serving 503 and retrying in the background. " +
      "Check DATABASE_URL and that the Render Postgres instance exists/is running.",
  );
  const server = serveUnavailable(state);

  const retry = async () => {
    state.attempts += 1;
    const { ok, output } = runMigrations();
    if (ok) {
      server.close(() => startApp());
      server.closeAllConnections?.();
      return;
    }
    state.lastSummary = summarize(output);
    log(`background retry #${state.attempts} failed (${state.lastSummary})`);
    setTimeout(retry, BACKGROUND_RETRY_MS);
  };
  setTimeout(retry, BACKGROUND_RETRY_MS);
}

main();
