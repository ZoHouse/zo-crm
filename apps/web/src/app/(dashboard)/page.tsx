import { getDb, schema } from "@/lib/db";
import { sql, count, avg, sum, desc } from "drizzle-orm";

// Prevent prerendering - database not available at build time on Vercel
export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, TrendingUp, Activity, UserCheck, Clock } from "lucide-react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import Link from "next/link";

async function getDashboardData() {
  const db = getDb();

  // Get basic stats
  const [statsRow] = await db
    .select({
      totalContacts: count(),
      totalRevenue: sum(schema.contacts.revenue),
      avgLeadScore: avg(schema.contacts.leadScore),
    })
    .from(schema.contacts);

  // Get membership status breakdown
  const membershipStats = await db
    .select({
      status: schema.contacts.membershipStatus,
      count: count(),
    })
    .from(schema.contacts)
    .groupBy(schema.contacts.membershipStatus);

  // Get recent contacts
  const recentContacts = await db
    .select()
    .from(schema.contacts)
    .orderBy(desc(schema.contacts.createdAt))
    .limit(5);

  // Get top engaged contacts (by lead score)
  const topContacts = await db
    .select()
    .from(schema.contacts)
    .orderBy(desc(schema.contacts.leadScore))
    .limit(5);

  const activeMembers = membershipStats.find((m) => m.status === "active")?.count || 0;
  const pendingMembers = membershipStats.find((m) => m.status === "pending")?.count || 0;

  return {
    totalContacts: statsRow.totalContacts || 0,
    totalRevenue: Number(statsRow.totalRevenue) || 0,
    avgLeadScore: Math.round(Number(statsRow.avgLeadScore) || 0),
    activeMembers,
    pendingMembers,
    membershipStats,
    recentContacts,
    topContacts,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to your Smart CRM</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalContacts.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Lead Score</p>
                <p className="text-2xl font-bold text-gray-900">{data.avgLeadScore}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Members</p>
                <p className="text-2xl font-bold text-gray-900">{data.activeMembers}</p>
                <p className="text-xs text-gray-400 mt-1">{data.pendingMembers} pending</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
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
                    {getInitials(contact.name, contact.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {contact.name || contact.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatDate(contact.firstSeen)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Engaged Contacts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Engaged</CardTitle>
              <Badge variant="success">By Lead Score</Badge>
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
                    {getInitials(contact.name, contact.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {contact.name || contact.email}
                    </p>
                    {contact.membershipName && (
                      <p className="text-xs text-gray-500 truncate">{contact.membershipName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        (contact.leadScore ?? 0) >= 70
                          ? "success"
                          : (contact.leadScore ?? 0) >= 40
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {contact.leadScore ?? 0}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Membership Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.membershipStats.map((stat) => (
              <div
                key={stat.status || "none"}
                className="p-4 rounded-lg bg-gray-50 border border-gray-100"
              >
                <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                <p className="text-sm text-gray-500 capitalize">
                  {stat.status || "No membership"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
