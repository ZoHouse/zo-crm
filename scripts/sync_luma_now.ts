#!/usr/bin/env tsx

/**
 * Direct Luma Sync Script
 * Syncs all Luma contacts to Supabase without needing the dev server
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
    
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Failed to fetch events: ${res.status}`);
      break;
    }

    const data = await res.json();
    const events = data.entries?.map((e: { event: LumaEvent }) => e.event) || [];
    allEvents.push(...events);
    
    hasMore = data.has_more === true;
    cursor = data.next_cursor || null;
    
    console.log(`  Fetched ${allEvents.length} events so far...`);
  }

  return allEvents;
}

async function fetchAllGuests(apiKey: string, eventId: string): Promise<LumaGuest[]> {
  const allGuests: LumaGuest[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  const baseUrl = "https://api.lu.ma/public/v1";
  const headers = { "x-luma-api-key": apiKey };

  while (hasMore) {
    const url: string = cursor
      ? `${baseUrl}/event/get-guests?event_api_id=${eventId}&pagination_cursor=${encodeURIComponent(cursor)}`
      : `${baseUrl}/event/get-guests?event_api_id=${eventId}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Failed to fetch guests for event ${eventId}: ${res.status}`);
      break;
    }

    const data = await res.json();
    const guests = data.entries?.map((g: { guest: LumaGuest }) => ({
      ...g.guest,
      event_api_id: eventId,
    })) || [];
    allGuests.push(...guests);

    hasMore = data.has_more === true;
    cursor = data.next_cursor || null;
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
  console.log('\n🚀 Starting Luma Sync to Supabase...\n');

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
    calendars: [] as { name: string; events: number; guests: number }[],
    totalContacts: 0,
    imported: 0,
    errors: 0,
  };

  // Process each calendar
  for (const [apiKey, calendarName] of [[apiKey1, calendarName1], [apiKey2, calendarName2]]) {
    if (!apiKey) continue;

    console.log(`\n📅 [${calendarName}] Fetching events...`);
    const events = await fetchAllEvents(apiKey);
    console.log(`✓ [${calendarName}] Found ${events.length} events\n`);

    // Build event name map
    const eventMap = new Map<string, string>();
    events.forEach(e => eventMap.set(e.api_id, e.name));

    // Fetch all guests
    console.log(`👥 [${calendarName}] Fetching guests from ${events.length} events...`);
    const allGuests: LumaGuest[] = [];
    const batchSize = 10;

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(event => fetchAllGuests(apiKey, event.api_id))
      );
      batchResults.forEach(guests => allGuests.push(...guests));
      console.log(`  Processed ${Math.min(i + batchSize, events.length)}/${events.length} events`);
    }

    console.log(`✓ [${calendarName}] Total guests: ${allGuests.length}\n`);
    results.calendars.push({ name: calendarName, events: events.length, guests: allGuests.length });

    // Deduplicate and transform to contacts
    console.log(`🔄 [${calendarName}] Deduplicating and preparing contacts...`);
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
    console.log(`✓ [${calendarName}] Prepared ${contacts.length} unique contacts\n`);

    // Upsert to Supabase in batches
    console.log(`💾 [${calendarName}] Uploading to Supabase...`);
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

      console.log(`  Uploaded ${Math.min(i + upsertBatchSize, contacts.length)}/${contacts.length} contacts`);
    }
    console.log(`✓ [${calendarName}] Upload complete!\n`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ LUMA SYNC COMPLETE!');
  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Total Contacts: ${results.totalContacts}`);
  console.log(`   Imported: ${results.imported}`);
  console.log(`   Errors: ${results.errors}`);
  console.log(`\n📅 Calendars:`);
  results.calendars.forEach(cal => {
    console.log(`   - ${cal.name}: ${cal.events} events, ${cal.guests} guests`);
  });
  console.log('\n' + '='.repeat(60) + '\n');
}

main().catch(console.error);
