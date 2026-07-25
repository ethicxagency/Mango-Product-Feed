import fs from "node:fs";
import path from "node:path";

import packageJson from "../../package.json";

export function getAppVersion(): string {
  return packageJson.version ?? "0.0.0";
}

/** Reports the most recently applied migration folder name as a lightweight,
 * real "database version" indicator — no separate version table to keep in
 * sync, just reads what's already on disk. */
export function getDatabaseVersion(): string {
  try {
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const folders = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    return folders.at(-1) ?? "unmigrated";
  } catch {
    return "unknown";
  }
}
