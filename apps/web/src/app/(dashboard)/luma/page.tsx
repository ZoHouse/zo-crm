// Prevent prerendering - database queries at runtime only
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, 
  Users, 
  Phone, 
  Wallet, 
  MessageCircle,
  UserCheck,
  Building2,
  User,
  Briefcase,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { LumaSyncButton } from "@/components/luma-sync-button";
import Link from "next/link";

// Server-side Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getEmailType(email: string): 'personal' | 'business' {
  const personalDomains = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'live.com', 'icloud.com', 'aol.com', 'protonmail.com',
  ]);
  const domain = email.split('@')[1]?.toLowerCase();
  return personalDomains.has(domain) ? 'personal' : 'business';
}

interface PageProps {
  searchParams: Promise<{
    filter?: 'business' | 'personal';
  }>;
}

async function getLumaStats(emailFilter?: 'business' | 'personal') {
  const supabase = getSupabase();

  // Get all Luma contacts
  let query = supabase
    .from('contacts')
    .select('*')
    .eq('source', 'luma');

  const { data: contacts, error } = await query;

  if (error || !contacts) {
    return {
      totalContacts: 0,
      contactsWithPhone: 0,
      contactsWithWallet: 0,
      contactsWithTelegram: 0,
      totalRevenue: 0,
      repeatAttendees: 0,
      businessEmails: [],
      personalEmails: [],
      topDomains: [],
      recentContacts: [],
    };
  }

  // Process contacts
  const businessEmails = contacts.filter(c => getEmailType(c.email) === 'business');
  const personalEmails = contacts.filter(c => getEmailType(c.email) === 'personal');

  // Filter if needed
  const filteredContacts = emailFilter 
    ? contacts.filter(c => getEmailType(c.email) === emailFilter)
    : contacts;

  // Top company domains
  const domainCounts = new Map<string, number>();
  businessEmails.forEach(c => {
    const domain = c.email.split('@')[1];
    if (domain) {
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    }
  });
  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    totalContacts: contacts.length,
    contactsWithPhone: contacts.filter(c => c.phone).length,
    contactsWithWallet: contacts.filter(c => c.eth_address || c.solana_address).length,
    contactsWithTelegram: contacts.filter(c => c.telegram).length,
    totalRevenue: contacts.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0),
    repeatAttendees: contacts.filter(c => (c.events_attended || 0) > 1).length,
    businessEmails,
    personalEmails,
    topDomains,
    recentContacts: filteredContacts.slice(0, 50),
  };
}

export default async function LumaLeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const emailFilter = params.filter;
  
  const stats = await getLumaStats(emailFilter);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Luma Leads</h1>
          <p className="text-sm md:text-base text-gray-500">
            Analytics from imported Luma event contacts
          </p>
        </div>
        <LumaSyncButton />
      </div>

      {stats.totalContacts === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Luma Contacts Yet</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Sync your Luma events to see analytics and insights about your event attendees.
              </p>
              <Link
                href="/import"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to Import Page
              </Link>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.totalContacts.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total Contacts</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <UserCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{stats.repeatAttendees.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Repeat Attendees</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Phone className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{stats.contactsWithPhone.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">With Phone</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Wallet className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{stats.contactsWithWallet.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">With Wallet</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <MessageCircle className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{stats.contactsWithTelegram.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">With Telegram</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <DollarSign className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    ${(stats.totalRevenue / 1000).toFixed(0)}k
                  </p>
                  <p className="text-xs text-gray-500">Total Revenue</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Email Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-900">Business</span>
                  </div>
                  <p className="text-3xl font-bold text-emerald-700">{stats.businessEmails.length.toLocaleString()}</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {stats.totalContacts > 0 ? Math.round((stats.businessEmails.length / stats.totalContacts) * 100) : 0}%
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-medium text-slate-900">Personal</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-700">{stats.personalEmails.length.toLocaleString()}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {stats.totalContacts > 0 ? Math.round((stats.personalEmails.length / stats.totalContacts) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Company Domains */}
          {stats.topDomains.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Top Company Domains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {stats.topDomains.map(([domain, count], idx) => (
                    <div key={domain} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-emerald-600 w-4">{idx + 1}</span>
                        <span className="text-sm font-medium text-gray-900 truncate">@{domain}</span>
                      </div>
                      <Badge variant="secondary" className="ml-2 shrink-0">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/contacts?source=luma"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Users className="w-4 h-4 mr-2" />
              View All Luma Contacts
            </Link>
            <Link
              href="/import"
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Sync More Data
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
