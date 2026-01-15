import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getDbPath() {
  // In development, use the data folder at project root
  // This works both from packages/db and from apps/web
  const possiblePaths = [
    resolve(__dirname, "../../../data/crm.db"),
    resolve(__dirname, "../../data/crm.db"),
    resolve(process.cwd(), "data/crm.db"),
    resolve(process.cwd(), "../../data/crm.db"),
  ];

  // Try to find existing db or use the most likely path
  for (const p of possiblePaths) {
    try {
      const fs = require("fs");
      if (fs.existsSync(p)) return p;
    } catch {}
  }

  // Default to project root data folder
  return resolve(__dirname, "../../../data/crm.db");
}

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || getDbPath();

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

export { schema };
