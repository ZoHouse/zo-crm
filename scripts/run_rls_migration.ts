import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

dotenv.config({ path: resolve(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🔄 Running RLS policy migration...');
  
  const sqlFile = resolve(process.cwd(), 'supabase/migrations/002_fix_rls_policies.sql');
  const sql = readFileSync(sqlFile, 'utf-8');
  
  // Split by semicolon and filter out comments and empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));
  
  for (const statement of statements) {
    if (statement.length < 10) continue; // Skip very short statements
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.error('❌ Error:', error.message);
      } else {
        console.log('✅ Executed statement');
      }
    } catch (error) {
      // Try direct SQL execution if RPC doesn't work
      console.log('⚠️  RPC method not available, you need to run this SQL manually in Supabase SQL Editor');
      console.log('\nSQL to run:\n');
      console.log(sql);
      break;
    }
  }
}

runMigration().catch(console.error);
