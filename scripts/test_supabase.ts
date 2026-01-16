import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('🔍 Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  // Test 1: Check total count
  const { count, error: countError } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error counting contacts:', countError);
  } else {
    console.log(`✅ Total contacts in Supabase: ${count}`);
  }
  
  // Test 2: Fetch first 5 contacts
  const { data, error } = await supabase
    .from('contacts')
    .select('id, email, first_name, last_name')
    .limit(5);
  
  if (error) {
    console.error('❌ Error fetching contacts:', error);
  } else {
    console.log(`✅ Sample contacts:`, data);
  }
}

testSupabase().catch(console.error);
