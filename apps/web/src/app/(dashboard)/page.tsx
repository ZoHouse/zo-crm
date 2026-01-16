// Prevent prerendering - database queries at runtime only
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, TrendingUp, UserCheck, Upload } from "lucide-react";
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  company: string | null;
  relationship_stage: string | null;
  lead_score: number | null;
  total_spent: number | null;
  events_attended: number | null;
  source: string | null;
  created_at: string | null;
}

async function getDashboardData() {
  const supabase = getSupabase();

  // Get all counts in parallel
  const [
    totalResult,
    leadResult,
    engagedResult,
    partnerResult,
    vipResult,
    revenueResult,
    recentContacts,
    topContacts,
  ] = await Promise.all([
    // Total contacts
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    // By stage
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'lead'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'engaged'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'partner'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'vip'),
    // Total revenue
    supabase.from('contacts').select('total_spent'),
    // Recent contacts
    supabase
      .from('contacts')
      .select('id, first_name, last_name, email, company, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    // Top contacts by lead score
    supabase
      .from('contacts')
      .select('id, first_name, last_name, email, company, lead_score, relationship_stage')
      .order('lead_score', { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  // Calculate total revenue
  const totalRevenue = revenueResult.data?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0;
  
  // Calculate avg lead score
  const avgLeadScore = topContacts.data?.length 
    ? Math.round(topContacts.data.reduce((sum, c) => sum + (c.lead_score || 0), 0) / topContacts.data.length)
    : 0;

  return {
    totalContacts: totalResult.count || 0,
    totalRevenue,
    avgLeadScore,
    stages: {
      lead: leadResult.count || 0,
      engaged: engagedResult.count || 0,
      partner: partnerResult.count || 0,
      vip: vipResult.count || 0,
    },
    recentContacts: (recentContacts.data || []) as Contact[],
    topContacts: (topContacts.data || []) as Contact[],
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const hasData = data.totalContacts > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-500">Welcome to your Smart CRM</p>
      </div>

      {/* Import Prompt - shown when no data */}
      {!hasData && (
        <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Import Your Contacts
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Get started by importing your contacts from Luma events or uploading a CSV file.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/import"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Import Contacts
                </Link>
                <Link
                  href="/luma"
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Luma Leads
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Total Contacts</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{data.totalContacts.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                </div>
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Avg Lead Score</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{data.avgLeadScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">VIP Contacts</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{data.stages.vip}</p>
                <p className="text-xs text-gray-400 mt-1">{data.stages.partner} partners</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Contacts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Contacts</CardTitle>
                <Link href="/contacts" className="text-sm text-blue-600 hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentContacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                      {getInitials(contact.first_name, contact.last_name, contact.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.first_name && contact.last_name 
                          ? `${contact.first_name} ${contact.last_name}`
                          : contact.first_name || contact.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatDate(contact.created_at)}</p>
                    </div>
                  </Link>
                ))}
                {data.recentContacts.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No contacts yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Engaged Contacts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Engaged</CardTitle>
                <Badge variant="secondary">By Lead Score</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topContacts.map((contact, idx) => (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      {idx + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                      {getInitials(contact.first_name, contact.last_name, contact.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contact.first_name && contact.last_name 
                          ? `${contact.first_name} ${contact.last_name}`
                          : contact.first_name || contact.email}
                      </p>
                      {contact.company && (
                        <p className="text-xs text-gray-500 truncate">{contact.company}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          (contact.lead_score ?? 0) >= 70
                            ? "success"
                            : (contact.lead_score ?? 0) >= 40
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {contact.lead_score ?? 0}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {data.topContacts.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No contacts yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Relationship Stages Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Relationship Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-2xl font-bold text-blue-700">{data.stages.lead}</p>
              <p className="text-sm text-blue-600">Leads</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <p className="text-2xl font-bold text-green-700">{data.stages.engaged}</p>
              <p className="text-sm text-green-600">Engaged</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-2xl font-bold text-purple-700">{data.stages.partner}</p>
              <p className="text-sm text-purple-600">Partners</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-100">
              <p className="text-2xl font-bold text-yellow-700">{data.stages.vip}</p>
              <p className="text-sm text-yellow-600">VIPs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
