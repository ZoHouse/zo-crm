import Database from "better-sqlite3";
import { createClient } from '@supabase/supabase-js';
import { resolve } from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), "apps/web/.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in apps/web/.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQLite setup
const dbPath = resolve(process.cwd(), "data/crm.db");
const sqlite = new Database(dbPath);

async function migrate() {
  console.log("🚀 Starting migration from SQLite to Supabase...");

  // 1. Migrate Contacts
  const contacts = sqlite.prepare("SELECT * FROM contacts").all();
  console.log(`Found ${contacts.length} contacts in SQLite.`);

  if (contacts.length > 0) {
    const formattedContacts = contacts.map((c: any) => ({
      first_name: c.firstName || c.name?.split(' ')[0] || null,
      last_name: c.lastName || c.name?.split(' ').slice(1).join(' ') || null,
      email: c.email,
      phone: c.phone || null,
      company: c.company || null,
      relationship_stage: c.relationshipStage || 'lead',
      lead_score: c.leadScore || 0,
      source: c.source || 'sqlite_migration',
      source_detail: c.sourceDetail || null,
      telegram: c.telegram || null,
      twitter: c.twitter || null,
      linkedin: c.linkedin || null,
      whatsapp: c.whatsapp || null,
      eth_address: c.ethAddress || null,
      solana_address: c.solanaAddress || null,
      luma_user_id: c.lumaUserId || null,
      events_attended: c.eventsAttended || 0,
      total_spent: c.totalSpent || 0,
      notes: c.notes || null,
      created_at: c.createdAt || new Date().toISOString(),
    }));

    // Upsert in batches of 100
    for (let i = 0; i < formattedContacts.length; i += 100) {
      const batch = formattedContacts.slice(i, i + 100);
      const { error } = await supabase.from('contacts').upsert(batch, { onConflict: 'email' });
      if (error) {
        console.error(`❌ Error migrating contacts batch ${i}:`, error.message);
      } else {
        console.log(`✅ Migrated contacts ${i + 1} to ${Math.min(i + 100, formattedContacts.length)}`);
      }
    }
  }

  // 2. Migrate Activities
  const activities = sqlite.prepare("SELECT * FROM activities").all();
  console.log(`Found ${activities.length} activities in SQLite.`);

  if (activities.length > 0) {
    // We need to map SQLite IDs to Supabase IDs. 
    // Since we're using email as the unique key for contacts, we'll fetch them back.
    const { data: supabaseContacts } = await supabase.from('contacts').select('id, email');
    const emailToId = new Map(supabaseContacts?.map(c => [c.email, c.id]));

    const formattedActivities = activities.map((a: any) => {
      // Find the contact email in SQLite first
      const contact = sqlite.prepare("SELECT email FROM contacts WHERE id = ?").get(a.contactId) as any;
      const supabaseContactId = contact ? emailToId.get(contact.email) : null;

      if (!supabaseContactId) return null;

      return {
        contact_id: supabaseContactId,
        type: a.type || 'note',
        title: a.title || null,
        content: a.content || null,
        created_at: a.createdAt || new Date().toISOString(),
      };
    }).filter(Boolean);

    if (formattedActivities.length > 0) {
      const { error } = await supabase.from('activities').insert(formattedActivities);
      if (error) {
        console.error("❌ Error migrating activities:", error.message);
      } else {
        console.log(`✅ Migrated ${formattedActivities.length} activities.`);
      }
    }
  }

  console.log("🏁 Migration finished!");
}

migrate().catch(console.error);
