import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";

export function runMigrations(): void {
  const folder = path.resolve(process.cwd(), "drizzle");
  if (!fs.existsSync(path.join(folder, "meta", "_journal.json"))) {
    throw new Error(`No Drizzle migrations found at ${folder}. Run: npx drizzle-kit generate`);
  }
  migrate(db, { migrationsFolder: folder });
}
