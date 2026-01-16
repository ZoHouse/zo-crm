import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Test with ANON key (what the app actually uses)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonAccess() {
  console.log('🔍 Testing with ANON key (what your app uses)...');
  
  // Test count
  const { count, error: countError } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error counting contacts:', countError.message);
    console.log('\n⚠️  RLS policies still blocking access. Please re-run the SQL in Supabase.');
  } else {
    console.log(`✅ SUCCESS! Can now read ${count} contacts with anon key`);
  }
  
  // Test actual data fetch
  const { data, error } = await supabase
    .from('contacts')
    .select('id, email, first_name, last_name, relationship_stage')
    .limit(3);
  
  if (error) {
    console.error('❌ Error fetching contacts:', error.message);
  } else {
    console.log(`✅ Sample contacts:`, data);
    console.log('\n🎉 Your CRM app should now show all contacts!');
  }
}

testAnonAccess().catch(console.error);
