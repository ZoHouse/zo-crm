// Prevent prerendering - database queries at runtime only
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserCheck, Upload, Calendar } from "lucide-react";
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


async function getDashboardData() {
  const supabase = getSupabase();

  // Get all counts in parallel
  const [
    totalResult,
    leadResult,
    engagedResult,
    partnerResult,
    vipResult,
    eventsResult,
    withCompanyResult,
  ] = await Promise.all([
    // Total contacts
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    // By stage
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'lead'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'engaged'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'partner'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('relationship_stage', 'vip'),
    // Total events attended (sum)
    supabase.from('contacts').select('events_attended'),
    // Contacts with company
    supabase.from('contacts').select('*', { count: 'exact', head: true }).not('company', 'is', null),
  ]);

  // Calculate total events attended
  const totalEvents = eventsResult.data?.reduce((sum, c) => sum + (Number(c.events_attended) || 0), 0) || 0;

  return {
    totalContacts: totalResult.count || 0,
    totalEvents,
    withCompany: withCompanyResult.count || 0,
    stages: {
      lead: leadResult.count || 0,
      engaged: engagedResult.count || 0,
      partner: partnerResult.count || 0,
      vip: vipResult.count || 0,
    },
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
              <Link
                href="/import"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Import Contacts
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
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
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">Event Registrations</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{data.totalEvents.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500">With Company</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{data.withCompany.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">{Math.round((data.withCompany / data.totalContacts) * 100)}% of contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
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
