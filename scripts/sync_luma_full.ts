#!/usr/bin/env tsx

/**
 * Full Luma Sync Script with Rate Limit Handling
 * Syncs ALL Luma contacts to Supabase with retry logic
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: './apps/web/.env.local' });

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk',
  'hotmail.com', 'hotmail.co.uk',
  'outlook.com', 'outlook.in',
  'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'protonmail.com', 'proton.me',
]);

interface LumaGuest {
  api_id: string;
  user_api_id: string;
  name?: string;
  user_name?: string;
  email: string;
  user_email?: string;
  phone_number?: string;
  eth_address?: string;
  solana_address?: string;
  created_at: string;
  registered_at?: string;
  event_api_id: string;
  registration_answers?: Array<{
    label: string;
    value: string;
  }>;
  event_ticket?: {
    amount: number;
  };
}

interface LumaEvent {
  api_id: string;
  name: string;
}

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry logic
async function fetchWithRetry(url: string, headers: Record<string, string>, maxRetries = 5): Promise<Response | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      
      if (res.ok) {
        return res;
      }
      
      if (res.status === 429) {
        // Rate limited - wait exponentially longer each time
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
        console.log(`    ⏳ Rate limited, waiting ${waitTime/1000}s before retry ${attempt + 1}/${maxRetries}...`);
        await delay(waitTime);
        continue;
      }
      
      // Other error - log and return null
      console.log(`    ❌ HTTP ${res.status} for ${url.substring(0, 80)}...`);
      return null;
    } catch (error) {
      const waitTime = 1000 * Math.pow(2, attempt);
      console.log(`    ❌ Network error, waiting ${waitTime/1000}s before retry...`);
      await delay(waitTime);
    }
  }
  
  console.log(`    ❌ Max retries exceeded for ${url.substring(0, 80)}...`);
  return null;
}

async function fetchAllEvents(apiKey: string): Promise<LumaEvent[]> {
  const allEvents: LumaEvent[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  const baseUrl = "https://api.lu.ma/public/v1";
  const headers = { "x-luma-api-key": apiKey };

  while (hasMore) {
    const url: string = cursor 
      ? `${baseUrl}/calendar/list-events?pagination_cursor=${encodeURIComponent(cursor)}`
      : `${baseUrl}/calendar/list-events`;
    
    const res = await fetchWithRetry(url, headers);
    if (!res) break;

    const data = await res.json();
    const events = data.entries?.map((e: { event: LumaEvent }) => e.event) || [];
    allEvents.push(...events);
    
    hasMore = data.has_more === true;
    cursor = data.next_cursor || null;
    
    console.log(`  📅 Fetched ${allEvents.length} events so far...`);
    
    // Small delay between pagination requests
    await delay(200);
  }

  return allEvents;
}

async function fetchAllGuests(apiKey: string, eventId: string, eventName: string): Promise<LumaGuest[]> {
  const allGuests: LumaGuest[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  const baseUrl = "https://api.lu.ma/public/v1";
  const headers = { "x-luma-api-key": apiKey };

  while (hasMore) {
    const url: string = cursor
      ? `${baseUrl}/event/get-guests?event_api_id=${eventId}&pagination_cursor=${encodeURIComponent(cursor)}`
      : `${baseUrl}/event/get-guests?event_api_id=${eventId}`;

    const res = await fetchWithRetry(url, headers);
    if (!res) break;

    const data = await res.json();
    const guests = data.entries?.map((g: { guest: LumaGuest }) => ({
      ...g.guest,
      event_api_id: eventId,
    })) || [];
    allGuests.push(...guests);

    hasMore = data.has_more === true;
    cursor = data.next_cursor || null;
    
    // Delay between pagination
    if (hasMore) await delay(150);
  }

  return allGuests;
}

function extractSocialHandle(answers: LumaGuest['registration_answers'], keywords: string[]): string | undefined {
  if (!answers) return undefined;
  const answer = answers.find(a => 
    keywords.some(k => a.label.toLowerCase().includes(k))
  );
  const value = answer?.value;
  return typeof value === 'string' ? value : undefined;
}

function getCompanyFromEmail(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || PERSONAL_EMAIL_DOMAINS.has(domain)) return null;
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

async function main() {
  console.log('\n🚀 Starting FULL Luma Sync to Supabase (with rate limit handling)...\n');

  // Verify environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey1 = process.env.LUMA_API_KEY_1 || "";
  const apiKey2 = process.env.LUMA_API_KEY_2 || "";
  const calendarName1 = process.env.LUMA_CALENDAR_NAME_1 || "Calendar 1";
  const calendarName2 = process.env.LUMA_CALENDAR_NAME_2 || "Calendar 2";

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables!');
    process.exit(1);
  }

  if (!apiKey1 && !apiKey2) {
    console.error('❌ Missing Luma API keys!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const results = {
    calendars: [] as { name: string; events: number; guests: number; uniqueContacts: number }[],
    totalContacts: 0,
    imported: 0,
    errors: 0,
  };

  // Process each calendar
  for (const [apiKey, calendarName] of [[apiKey1, calendarName1], [apiKey2, calendarName2]]) {
    if (!apiKey) continue;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📅 [${calendarName}] Starting sync...`);
    console.log(`${'='.repeat(60)}\n`);
    
    const events = await fetchAllEvents(apiKey);
    console.log(`\n✓ Found ${events.length} total events\n`);

    // Build event name map
    const eventMap = new Map<string, string>();
    events.forEach(e => eventMap.set(e.api_id, e.name));

    // Fetch all guests - ONE AT A TIME with delays
    console.log(`👥 Fetching guests from ${events.length} events (this will take a while)...\n`);
    const allGuests: LumaGuest[] = [];
    let skippedEvents = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventName = event.name.substring(0, 40);
      
      process.stdout.write(`  [${i + 1}/${events.length}] ${eventName}... `);
      
      const guests = await fetchAllGuests(apiKey, event.api_id, event.name);
      
      if (guests.length > 0) {
        allGuests.push(...guests);
        console.log(`✓ ${guests.length} guests`);
      } else {
        console.log(`(no guests or skipped)`);
        skippedEvents++;
      }
      
      // Delay between events to avoid rate limiting
      await delay(300);
      
      // Progress update every 50 events
      if ((i + 1) % 50 === 0) {
        console.log(`\n  📊 Progress: ${i + 1}/${events.length} events, ${allGuests.length.toLocaleString()} guests collected\n`);
      }
    }

    console.log(`\n✓ [${calendarName}] Total guests fetched: ${allGuests.length.toLocaleString()}`);
    if (skippedEvents > 0) {
      console.log(`  ⚠️  ${skippedEvents} events had no guests or were skipped`);
    }

    // Deduplicate and transform to contacts
    console.log(`\n🔄 Deduplicating and preparing contacts...`);
    const contactMap = new Map<string, {
      email: string;
      first_name?: string;
      last_name?: string;
      phone?: string;
      company?: string;
      telegram?: string;
      twitter?: string;
      linkedin?: string;
      eth_address?: string;
      solana_address?: string;
      luma_user_id?: string;
      events_attended: number;
      total_spent: number;
      source: string;
      source_detail: string;
      relationship_stage: string;
    }>();

    for (const guest of allGuests) {
      const email = (guest.user_email || guest.email)?.toLowerCase();
      if (!email) continue;

      const existing = contactMap.get(email);
      const ticketAmount = guest.event_ticket?.amount || 0;

      if (existing) {
        existing.events_attended++;
        existing.total_spent += ticketAmount;
        if (!existing.phone && guest.phone_number) existing.phone = guest.phone_number;
        if (!existing.eth_address && guest.eth_address) existing.eth_address = guest.eth_address;
        if (!existing.solana_address && guest.solana_address) existing.solana_address = guest.solana_address;
        if (!existing.telegram) {
          const tg = extractSocialHandle(guest.registration_answers, ['telegram']);
          if (tg) existing.telegram = tg;
        }
        if (!existing.twitter) {
          const tw = extractSocialHandle(guest.registration_answers, ['twitter', 'x handle']);
          if (tw) existing.twitter = tw;
        }
      } else {
        const name = guest.user_name || guest.name || '';
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        contactMap.set(email, {
          email,
          first_name: firstName,
          last_name: lastName,
          phone: guest.phone_number,
          company: getCompanyFromEmail(email) || undefined,
          telegram: extractSocialHandle(guest.registration_answers, ['telegram']),
          twitter: extractSocialHandle(guest.registration_answers, ['twitter', 'x handle']),
          linkedin: extractSocialHandle(guest.registration_answers, ['linkedin']),
          eth_address: guest.eth_address,
          solana_address: guest.solana_address,
          luma_user_id: guest.user_api_id,
          events_attended: 1,
          total_spent: ticketAmount,
          source: 'luma',
          source_detail: calendarName,
          relationship_stage: 'lead',
        });
      }
    }

    const contacts = Array.from(contactMap.values());
    results.totalContacts += contacts.length;
    results.calendars.push({
      name: calendarName,
      events: events.length,
      guests: allGuests.length,
      uniqueContacts: contacts.length,
    });
    
    console.log(`✓ Prepared ${contacts.length.toLocaleString()} unique contacts\n`);

    // Upsert to Supabase in batches
    console.log(`💾 Uploading to Supabase...`);
    const upsertBatchSize = 100;
    for (let i = 0; i < contacts.length; i += upsertBatchSize) {
      const batch = contacts.slice(i, i + upsertBatchSize);
      
      const { data, error } = await supabase
        .from('contacts')
        .upsert(batch, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error(`  ❌ Error upserting batch:`, error.message);
        results.errors += batch.length;
      } else {
        results.imported += data?.length || 0;
      }

      if ((i + upsertBatchSize) % 500 === 0 || i + upsertBatchSize >= contacts.length) {
        console.log(`  Uploaded ${Math.min(i + upsertBatchSize, contacts.length).toLocaleString()}/${contacts.length.toLocaleString()} contacts`);
      }
    }
    console.log(`✓ [${calendarName}] Upload complete!\n`);
  }

  // Final count from Supabase
  const { count: finalCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ FULL LUMA SYNC COMPLETE!');
  console.log('='.repeat(60));
  console.log(`\n📊 Sync Summary:`);
  console.log(`   Unique Contacts Processed: ${results.totalContacts.toLocaleString()}`);
  console.log(`   Contacts Imported/Updated: ${results.imported.toLocaleString()}`);
  console.log(`   Errors: ${results.errors}`);
  console.log(`\n📅 Calendars:`);
  results.calendars.forEach(cal => {
    console.log(`   - ${cal.name}:`);
    console.log(`     Events: ${cal.events}`);
    console.log(`     Total Guests: ${cal.guests.toLocaleString()}`);
    console.log(`     Unique Contacts: ${cal.uniqueContacts.toLocaleString()}`);
  });
  console.log(`\n💾 Total Contacts in Supabase: ${finalCount?.toLocaleString() || 'Unknown'}`);
  console.log('\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
