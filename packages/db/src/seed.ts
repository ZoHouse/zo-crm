import { createReadStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse";
import { v4 as uuidv4 } from "uuid";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// CSV file path
const CSV_PATH =
  "/Users/samuraizan/Desktop/BLRxZo - Members - 2026-01-13-07-56-48.csv";

// Database path
const DB_PATH = resolve(__dirname, "../../../data/crm.db");

interface CsvRow {
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  first_seen: string;
  user_api_id: string;
  tags: string;
  revenue: string;
  event_approved_count: string;
  event_checked_in_count: string;
  membership_name: string;
  membership_status: string;
}

async function seed() {
  console.log("🌱 Starting database seed...");
  console.log(`📂 CSV: ${CSV_PATH}`);
  console.log(`💾 Database: ${DB_PATH}`);

  // Initialize database
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      name TEXT,
      email TEXT NOT NULL,
      user_api_id TEXT,
      first_seen TEXT,
      revenue REAL DEFAULT 0,
      lead_score INTEGER DEFAULT 0,
      tags TEXT,
      membership_name TEXT,
      membership_status TEXT,
      event_approved_count INTEGER DEFAULT 0,
      event_checked_in_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      content TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_insights (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence_score REAL,
      generated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    CREATE INDEX IF NOT EXISTS idx_contacts_membership ON contacts(membership_status);
    CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
    CREATE INDEX IF NOT EXISTS idx_insights_contact ON ai_insights(contact_id);
  `);

  // Clear existing data
  sqlite.exec("DELETE FROM ai_insights");
  sqlite.exec("DELETE FROM activities");
  sqlite.exec("DELETE FROM contacts");

  console.log("📊 Parsing CSV...");

  const records: CsvRow[] = [];

  const parser = createReadStream(CSV_PATH).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    })
  );

  for await (const record of parser) {
    records.push(record as CsvRow);
  }

  console.log(`📝 Found ${records.length} records`);

  // Prepare insert statement
  const insertStmt = sqlite.prepare(`
    INSERT INTO contacts (
      id, first_name, last_name, name, email, user_api_id, first_seen,
      revenue, lead_score, tags, membership_name, membership_status,
      event_approved_count, event_checked_in_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  let imported = 0;
  let skipped = 0;

  // Insert in a transaction for performance
  const insertAll = sqlite.transaction(() => {
    for (const row of records) {
      // Skip rows without email
      if (!row.email || row.email.trim() === "") {
        skipped++;
        continue;
      }

      const revenue = parseFloat(row.revenue?.replace("$", "") || "0") || 0;
      const eventApproved = parseInt(row.event_approved_count || "0") || 0;
      const eventCheckedIn = parseInt(row.event_checked_in_count || "0") || 0;

      // Calculate initial lead score based on engagement
      let leadScore = 0;
      if (revenue > 0) leadScore += 30;
      if (eventApproved > 0) leadScore += 20;
      if (eventCheckedIn > 0) leadScore += 25;
      if (row.membership_status === "active") leadScore += 25;
      if (row.membership_name) leadScore += 10;

      insertStmt.run(
        uuidv4(),
        row.first_name?.trim() || null,
        row.last_name?.trim() || null,
        row.name?.trim() || null,
        row.email.trim(),
        row.user_api_id || null,
        row.first_seen || null,
        revenue,
        Math.min(leadScore, 100),
        row.tags ? JSON.stringify(row.tags.split(",").map((t) => t.trim())) : null,
        row.membership_name?.trim() || null,
        row.membership_status?.trim() || null,
        eventApproved,
        eventCheckedIn,
        now,
        now
      );

      imported++;
    }
  });

  insertAll();

  console.log(`✅ Imported ${imported} contacts`);
  if (skipped > 0) {
    console.log(`⚠️  Skipped ${skipped} rows (missing email)`);
  }

  // Create some sample activities for the first few contacts
  const sampleContacts = sqlite
    .prepare("SELECT id, name, email FROM contacts LIMIT 10")
    .all() as { id: string; name: string; email: string }[];

  const activityStmt = sqlite.prepare(`
    INSERT INTO activities (id, contact_id, type, content, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertActivities = sqlite.transaction(() => {
    for (const contact of sampleContacts) {
      activityStmt.run(
        uuidv4(),
        contact.id,
        "system",
        `Contact imported from BLRxZo Members CSV`,
        JSON.stringify({ source: "csv_import" }),
        now
      );
    }
  });

  insertActivities();

  console.log(`📝 Created ${sampleContacts.length} sample activities`);

  // Print summary stats
  const stats = sqlite
    .prepare(
      `
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN membership_status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active,
      COUNT(CASE WHEN membership_name IS NOT NULL THEN 1 END) as with_membership,
      AVG(lead_score) as avg_lead_score
    FROM contacts
  `
    )
    .get() as {
    total: number;
    pending: number;
    active: number;
    with_membership: number;
    avg_lead_score: number;
  };

  console.log("\n📈 Database Summary:");
  console.log(`   Total contacts: ${stats.total}`);
  console.log(`   With membership: ${stats.with_membership}`);
  console.log(`   Pending: ${stats.pending}`);
  console.log(`   Active: ${stats.active}`);
  console.log(`   Avg lead score: ${stats.avg_lead_score?.toFixed(1) || 0}`);

  sqlite.close();
  console.log("\n🎉 Seed completed!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
