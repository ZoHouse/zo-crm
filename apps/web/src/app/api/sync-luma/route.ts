import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Common personal email domains
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
    if (!res.ok) break;

    const data = await res.json();
    const events = data.entries?.map((e: { event: LumaEvent }) => e.event) || [];
    allEvents.push(...events);
    
    hasMore = data.has_more === true;
    cursor = data.next_cursor || null;
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
    if (!res.ok) break;

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
  // Convert domain to company name (stripe.com -> Stripe)
  const name = domain.split('.')[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export async function POST(request: Request) {
  try {
    const apiKey1 = process.env.LUMA_API_KEY_1 || "";
    const apiKey2 = process.env.LUMA_API_KEY_2 || "";
    const calendarName1 = process.env.LUMA_CALENDAR_NAME_1 || "Calendar 1";
    const calendarName2 = process.env.LUMA_CALENDAR_NAME_2 || "Calendar 2";

    const results = {
      calendars: [] as { name: string; events: number; guests: number }[],
      totalContacts: 0,
      imported: 0,
      duplicates: 0,
      errors: 0,
    };

    // Process each calendar
    for (const [apiKey, calendarName] of [[apiKey1, calendarName1], [apiKey2, calendarName2]]) {
      if (!apiKey) continue;

      console.log(`[${calendarName}] Fetching events...`);
      const events = await fetchAllEvents(apiKey);
      console.log(`[${calendarName}] Found ${events.length} events`);

      // Build event name map
      const eventMap = new Map<string, string>();
      events.forEach(e => eventMap.set(e.api_id, e.name));

      // Fetch all guests
      const allGuests: LumaGuest[] = [];
      const batchSize = 10;

      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(event => fetchAllGuests(apiKey, event.api_id))
        );
        batchResults.forEach(guests => allGuests.push(...guests));
        console.log(`[${calendarName}] Processed ${Math.min(i + batchSize, events.length)}/${events.length} events`);
      }

      console.log(`[${calendarName}] Total guests: ${allGuests.length}`);
      results.calendars.push({ name: calendarName, events: events.length, guests: allGuests.length });

      // Deduplicate and transform to contacts
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
        const eventName = eventMap.get(guest.event_api_id) || '';
        const ticketAmount = guest.event_ticket?.amount || 0;

        if (existing) {
          existing.events_attended++;
          existing.total_spent += ticketAmount;
          // Update with any new data
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

      // Convert to array and upsert to Supabase in batches
      const contacts = Array.from(contactMap.values());
      results.totalContacts += contacts.length;

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
          console.error(`Error upserting batch:`, error);
          results.errors += batch.length;
        } else {
          results.imported += data?.length || 0;
        }

        console.log(`[${calendarName}] Upserted ${Math.min(i + upsertBatchSize, contacts.length)}/${contacts.length} contacts`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${results.imported} contacts from Luma`,
      ...results,
    });

  } catch (error) {
    console.error('Luma sync error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to sync Luma contacts to Supabase',
  });
}
