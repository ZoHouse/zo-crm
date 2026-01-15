import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@smart-crm/db/schema";
import { resolve } from "path";

// Database path relative to project root
const dbPath = resolve(process.cwd(), "../../data/crm.db");

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export { schema };
