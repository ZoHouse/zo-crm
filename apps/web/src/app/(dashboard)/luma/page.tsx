import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CalendarDays, 
  Users, 
  Mail, 
  Phone, 
  Wallet, 
  MessageCircle,
  Clock, 
  ExternalLink, 
  RefreshCw,
  DollarSign,
  UserCheck,
  Building2,
  User,
  Briefcase
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { LumaSyncButton } from "@/components/luma-sync-button";

interface RegistrationAnswer {
  label: string;
  value: string;
  answer: string;
  question_id: string;
  question_type: string;
}

interface EventTicket {
  amount: number;
  currency: string | null;
  name: string;
}

interface LumaEvent {
  api_id: string;
  name: string;
  description?: string;
  start_at: string;
  end_at: string;
  timezone: string;
  url: string;
  cover_url?: string;
  geo_address_json?: {
    city?: string;
    country?: string;
    address?: string;
  };
  guest_count?: number;
}

interface LumaGuest {
  api_id: string;
  user_api_id: string;
  name?: string;
  user_name?: string;
  user_first_name?: string;
  user_last_name?: string;
  email: string;
  user_email?: string;
  phone_number?: string;
  eth_address?: string;
  solana_address?: string;
  created_at: string;
  registered_at?: string;
  approval_status: string;
  checked_in_at?: string;
  event_api_id: string;
  registration_answers?: RegistrationAnswer[];
  event_ticket?: EventTicket;
}

interface UniqueContact {
  user_api_id: string;
  name: string;
  email: string;
  email_type: 'personal' | 'business';
  email_domain: string;
  phone?: string;
  eth_address?: string;
  solana_address?: string;
  telegram?: string;
  twitter?: string;
  linkedin?: string;
  first_seen: string;
  events_count: number;
  total_spent: number;
  events: string[];
}

// Common personal email domains
const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
  'outlook.com', 'outlook.in',
  'live.com', 'live.in',
  'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com',
  'protonmail.com', 'proton.me',
  'zoho.com',
  'yandex.com', 'yandex.ru',
  'mail.com', 'email.com',
  'gmx.com', 'gmx.de',
  'rediffmail.com',
  'fastmail.com',
  'tutanota.com',
  'hey.com',
  'pm.me',
]);

function getEmailType(email: string): { type: 'personal' | 'business'; domain: string } {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  const isPersonal = PERSONAL_EMAIL_DOMAINS.has(domain);
  return { type: isPersonal ? 'personal' : 'business', domain };
}

interface CalendarData {
  name: string;
  events: LumaEvent[];
  guests: LumaGuest[];
}

async function fetchAllEvents(apiKey: string, baseUrl: string, headers: Record<string, string>): Promise<LumaEvent[]> {
  const allEvents: LumaEvent[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  let retries = 0;
  const maxRetries = 3;

  while (hasMore && retries < maxRetries) {
    try {
      const url: string = cursor 
        ? `${baseUrl}/calendar/list-events?pagination_cursor=${encodeURIComponent(cursor)}`
        : `${baseUrl}/calendar/list-events`;
      
      const res = await fetch(url, {
        headers,
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        console.error(`Events fetch failed with status ${res.status}`);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const data = await res.json();
      const events = data.entries?.map((e: { event: LumaEvent }) => e.event) || [];
      allEvents.push(...events);
      
      hasMore = data.has_more === true;
      cursor = data.next_cursor || null;
      retries = 0; // Reset on success
    } catch (error) {
      console.error('Error fetching events:', error);
      retries++;
      if (retries >= maxRetries) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allEvents;
}

async function fetchAllGuests(apiKey: string, baseUrl: string, headers: Record<string, string>, eventId: string): Promise<LumaGuest[]> {
  const allGuests: LumaGuest[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  let retries = 0;
  const maxRetries = 2;

  while (hasMore && retries < maxRetries) {
    try {
      const url: string = cursor
        ? `${baseUrl}/event/get-guests?event_api_id=${eventId}&pagination_cursor=${encodeURIComponent(cursor)}`
        : `${baseUrl}/event/get-guests?event_api_id=${eventId}`;

      const res = await fetch(url, {
        headers,
        next: { revalidate: 300 },
      });

      if (!res.ok) {
        retries++;
        continue;
      }

      const data = await res.json();
      const guests = data.entries?.map((g: { guest: LumaGuest }) => ({
        ...g.guest,
        event_api_id: eventId,
      })) || [];
      allGuests.push(...guests);

      hasMore = data.has_more === true;
      cursor = data.next_cursor || null;
      retries = 0; // Reset retries on success
    } catch (error) {
      console.error(`Error fetching guests for event ${eventId}:`, error);
      retries++;
      if (retries >= maxRetries) break;
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return allGuests;
}

async function fetchLumaData(apiKey: string, calendarName: string): Promise<CalendarData> {
  if (!apiKey) {
    return { name: calendarName, events: [], guests: [] };
  }

  const baseUrl = "https://api.lu.ma/public/v1";
  const headers = {
    "x-luma-api-key": apiKey,
    "Content-Type": "application/json",
  };

  try {
    // Fetch ALL events with pagination
    const events = await fetchAllEvents(apiKey, baseUrl, headers);
    console.log(`[${calendarName}] Fetched ${events.length} events`);

    // Fetch guests for ALL events (in parallel batches for performance)
    const allGuests: LumaGuest[] = [];
    const batchSize = 5; // Reduced to avoid rate limiting

    for (let i = 0; i < events.length; i += batchSize) {
      try {
        const batch = events.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(event => fetchAllGuests(apiKey, baseUrl, headers, event.api_id))
        );
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            allGuests.push(...result.value);
          }
        });
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < events.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error in batch ${i}:`, error);
      }
    }

    console.log(`[${calendarName}] Fetched ${allGuests.length} total guests`);
    return { name: calendarName, events, guests: allGuests };
  } catch (error) {
    console.error(`Error fetching Luma data for ${calendarName}:`, error);
    return { name: calendarName, events: [], guests: [] };
  }
}

function extractSocialHandle(answers: RegistrationAnswer[] | undefined, keywords: string[]): string | undefined {
  if (!answers) return undefined;
  const answer = answers.find(a => 
    keywords.some(k => a.label.toLowerCase().includes(k))
  );
  return answer?.value;
}

function deduplicateContacts(guests: LumaGuest[], events: LumaEvent[]): UniqueContact[] {
  const contactMap = new Map<string, UniqueContact>();
  const eventMap = new Map<string, string>();
  
  // Build event name lookup
  events.forEach(e => eventMap.set(e.api_id, e.name));

  guests.forEach(guest => {
    const key = guest.user_api_id || guest.email || guest.user_email;
    if (!key) return;

    const existing = contactMap.get(key);
    const eventName = eventMap.get(guest.event_api_id) || guest.event_api_id;
    const ticketAmount = guest.event_ticket?.amount || 0;

    if (existing) {
      existing.events_count++;
      existing.total_spent += ticketAmount;
      if (!existing.events.includes(eventName)) {
        existing.events.push(eventName);
      }
      // Update with any new data
      if (!existing.phone && guest.phone_number) existing.phone = guest.phone_number;
      if (!existing.eth_address && guest.eth_address) existing.eth_address = guest.eth_address;
      if (!existing.solana_address && guest.solana_address) existing.solana_address = guest.solana_address;
      if (!existing.telegram) {
        existing.telegram = extractSocialHandle(guest.registration_answers, ['telegram']);
      }
      if (!existing.twitter) {
        existing.twitter = extractSocialHandle(guest.registration_answers, ['twitter', 'x handle', 'x (twitter)']);
      }
      if (!existing.linkedin) {
        existing.linkedin = extractSocialHandle(guest.registration_answers, ['linkedin']);
      }
      // Track earliest registration
      const guestDate = guest.registered_at || guest.created_at;
      if (guestDate && new Date(guestDate) < new Date(existing.first_seen)) {
        existing.first_seen = guestDate;
      }
    } else {
      const email = guest.user_email || guest.email;
      const { type: emailType, domain: emailDomain } = getEmailType(email);
      
      contactMap.set(key, {
        user_api_id: guest.user_api_id || key,
        name: guest.user_name || guest.name || 'Unknown',
        email,
        email_type: emailType,
        email_domain: emailDomain,
        phone: guest.phone_number || undefined,
        eth_address: guest.eth_address || undefined,
        solana_address: guest.solana_address || undefined,
        telegram: extractSocialHandle(guest.registration_answers, ['telegram']),
        twitter: extractSocialHandle(guest.registration_answers, ['twitter', 'x handle', 'x (twitter)']),
        linkedin: extractSocialHandle(guest.registration_answers, ['linkedin']),
        first_seen: guest.registered_at || guest.created_at,
        events_count: 1,
        total_spent: ticketAmount,
        events: [eventName],
      });
    }
  });

  return Array.from(contactMap.values()).sort(
    (a, b) => b.events_count - a.events_count
  );
}

interface PageProps {
  searchParams: Promise<{
    filter?: 'business' | 'personal';
  }>;
}

export default async function LumaLeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const emailFilter = params.filter;
  
  const apiKey1 = process.env.LUMA_API_KEY_1 || "";
  const apiKey2 = process.env.LUMA_API_KEY_2 || "";
  const calendarName1 = process.env.LUMA_CALENDAR_NAME_1 || "Calendar 1";
  const calendarName2 = process.env.LUMA_CALENDAR_NAME_2 || "Calendar 2";

  const [calendar1, calendar2] = await Promise.all([
    fetchLumaData(apiKey1, calendarName1),
    fetchLumaData(apiKey2, calendarName2),
  ]);

  const allEvents = [...calendar1.events, ...calendar2.events].sort(
    (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
  );

  const allGuests = [...calendar1.guests, ...calendar2.guests];
  
  // Deduplicate contacts
  const uniqueContacts = deduplicateContacts(allGuests, allEvents);
  
  // Calculate CRM stats
  const totalUniqueContacts = uniqueContacts.length;
  const contactsWithPhone = uniqueContacts.filter(c => c.phone).length;
  const contactsWithWallet = uniqueContacts.filter(c => c.eth_address || c.solana_address).length;
  const contactsWithTelegram = uniqueContacts.filter(c => c.telegram).length;
  const totalRevenue = uniqueContacts.reduce((sum, c) => sum + c.total_spent, 0);
  const repeatAttendees = uniqueContacts.filter(c => c.events_count > 1).length;
  
  // Email type stats
  const businessEmails = uniqueContacts.filter(c => c.email_type === 'business');
  const personalEmails = uniqueContacts.filter(c => c.email_type === 'personal');
  
  // Top company domains
  const domainCounts = new Map<string, number>();
  businessEmails.forEach(c => {
    domainCounts.set(c.email_domain, (domainCounts.get(c.email_domain) || 0) + 1);
  });
  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  // Filter contacts based on URL param
  const filteredContacts = emailFilter 
    ? uniqueContacts.filter(c => c.email_type === emailFilter)
    : uniqueContacts;

  const hasApiKeys = apiKey1 || apiKey2;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Luma Leads</h1>
          <p className="text-sm md:text-base text-gray-500">
            Contact data from {calendarName1} & {calendarName2}
          </p>
        </div>
        <LumaSyncButton />
      </div>

      {!hasApiKeys ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Luma Calendars</h3>
              <p className="text-gray-500 mb-4 max-w-md mx-auto">
                Add your Luma API keys to fetch contacts and leads.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-gray-700 mb-2">Add to .env.local:</p>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`LUMA_API_KEY_1=your_first_api_key
LUMA_API_KEY_2=your_second_api_key
LUMA_CALENDAR_NAME_1=Calendar Name 1
LUMA_CALENDAR_NAME_2=Calendar Name 2`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* CRM Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{totalUniqueContacts.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Unique Contacts</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CalendarDays className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{allEvents.length}</p>
                  <p className="text-xs text-gray-500">Total Events</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <UserCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{repeatAttendees.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Repeat Attendees</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Phone className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{contactsWithPhone.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">With Phone</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Wallet className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{contactsWithWallet.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">With Wallet</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <MessageCircle className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{contactsWithTelegram.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">With Telegram</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Company Domains */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Top Company Domains
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {topDomains.length > 0 ? (
                  topDomains.map(([domain, count], idx) => (
                    <div key={domain} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-emerald-600 w-4">{idx + 1}</span>
                        <span className="text-sm font-medium text-gray-900 truncate">@{domain}</span>
                      </div>
                      <Badge variant="secondary" className="ml-2 shrink-0">{count}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 col-span-full text-center py-4">No business emails found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Quality Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Quality Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email Coverage</p>
                  <p className="text-xl font-bold text-green-600">100%</p>
                  <p className="text-xs text-gray-400">{totalUniqueContacts.toLocaleString()} contacts</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Coverage</p>
                  <p className="text-xl font-bold text-orange-600">
                    {totalUniqueContacts > 0 ? Math.round((contactsWithPhone / totalUniqueContacts) * 100) : 0}%
                  </p>
                  <p className="text-xs text-gray-400">{contactsWithPhone.toLocaleString()} contacts</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Wallet Coverage</p>
                  <p className="text-xl font-bold text-indigo-600">
                    {totalUniqueContacts > 0 ? Math.round((contactsWithWallet / totalUniqueContacts) * 100) : 0}%
                  </p>
                  <p className="text-xs text-gray-400">{contactsWithWallet.toLocaleString()} contacts</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Telegram Coverage</p>
                  <p className="text-xl font-bold text-cyan-600">
                    {totalUniqueContacts > 0 ? Math.round((contactsWithTelegram / totalUniqueContacts) * 100) : 0}%
                  </p>
                  <p className="text-xs text-gray-400">{contactsWithTelegram.toLocaleString()} contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Contacts Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {emailFilter === 'business' ? 'Business Contacts' : emailFilter === 'personal' ? 'Personal Contacts' : 'All Contacts'} 
                ({filteredContacts.length.toLocaleString()})
              </CardTitle>
              <div className="flex items-center gap-2">
                <a
                  href="/luma"
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    !emailFilter ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  All ({totalUniqueContacts.toLocaleString()})
                </a>
                <a
                  href="/luma?filter=business"
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                    emailFilter === 'business' 
                      ? "bg-emerald-600 text-white" 
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Business ({businessEmails.length.toLocaleString()})
                </a>
                <a
                  href="/luma?filter=personal"
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                    emailFilter === 'personal' 
                      ? "bg-slate-600 text-white" 
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Personal ({personalEmails.length.toLocaleString()})
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Phone</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Socials</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Events</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">First Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.slice(0, 50).map((contact) => (
                      <tr
                        key={contact.user_api_id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                              {contact.name?.slice(0, 2).toUpperCase() || '??'}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{contact.email}</span>
                            <Badge 
                              variant={contact.email_type === 'business' ? 'success' : 'secondary'}
                              className="text-xs"
                            >
                              {contact.email_type === 'business' ? 'Business' : 'Personal'}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {contact.phone ? (
                            <span className="text-sm text-gray-600">{contact.phone}</span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {contact.telegram && (
                              <Badge variant="secondary" className="text-xs" title={typeof contact.telegram === 'string' ? contact.telegram : undefined}>
                                TG
                              </Badge>
                            )}
                            {contact.twitter && (
                              <Badge variant="secondary" className="text-xs" title={typeof contact.twitter === 'string' ? contact.twitter : undefined}>
                                X
                              </Badge>
                            )}
                            {(contact.eth_address || contact.solana_address) && (
                              <Badge variant="secondary" className="text-xs">
                                <Wallet className="w-3 h-3" />
                              </Badge>
                            )}
                            {!contact.telegram && !contact.twitter && !contact.eth_address && !contact.solana_address && (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={contact.events_count > 3 ? "success" : contact.events_count > 1 ? "warning" : "secondary"}>
                            {contact.events_count}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-500">{formatDate(contact.first_seen)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
              {filteredContacts.length > 50 && (
                <div className="mt-4 text-center">
                  <p className="text-xs sm:text-sm text-gray-500">
                    Showing 50 of {filteredContacts.length.toLocaleString()} contacts
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
