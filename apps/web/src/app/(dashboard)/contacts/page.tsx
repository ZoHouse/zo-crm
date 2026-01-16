// Prevent prerendering - database queries at runtime only
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, ChevronLeft, ChevronRight, Upload } from "lucide-react";
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

function getStageColor(stage: string | null): string {
  switch (stage) {
    case 'lead':
      return 'bg-blue-100 text-blue-700';
    case 'engaged':
      return 'bg-green-100 text-green-700';
    case 'partner':
      return 'bg-purple-100 text-purple-700';
    case 'vip':
      return 'bg-yellow-100 text-yellow-700';
    case 'inactive':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

interface PageProps {
  searchParams: Promise<{
    search?: string;
    stage?: string;
    page?: string;
    sort?: string;
    order?: string;
  }>;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  relationship_stage: string | null;
  lead_score: number | null;
  source: string | null;
  events_attended: number | null;
  created_at: string | null;
}

async function getContacts(params: {
  search?: string;
  stage?: string;
  page?: number;
  sort?: string;
  order?: string;
}) {
  const supabase = getSupabase();
  const pageSize = 20;
  const page = params.page || 1;
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' });

  // Apply search filter
  if (params.search) {
    query = query.or(
      `email.ilike.%${params.search}%,first_name.ilike.%${params.search}%,last_name.ilike.%${params.search}%,company.ilike.%${params.search}%`
    );
  }

  // Apply stage filter
  if (params.stage && params.stage !== 'all') {
    query = query.eq('relationship_stage', params.stage);
  }

  // Apply sorting
  const sortColumn = params.sort || 'created_at';
  const ascending = params.order === 'asc';
  query = query.order(sortColumn, { ascending, nullsFirst: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching contacts:', error);
    return { contacts: [], total: 0, page, pageSize, totalPages: 0 };
  }

  return {
    contacts: (data || []) as Contact[],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { contacts, total, page, totalPages } = await getContacts({
    search: params.search,
    stage: params.stage,
    page: params.page ? parseInt(params.page) : 1,
    sort: params.sort,
    order: params.order,
  });

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const current = new URLSearchParams();
    if (params.search) current.set("search", params.search);
    if (params.stage) current.set("stage", params.stage);
    if (params.sort) current.set("sort", params.sort);
    if (params.order) current.set("order", params.order);
    if (params.page) current.set("page", params.page);

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });

    const queryString = current.toString();
    return `/contacts${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500">{total.toLocaleString()} total contacts</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm">Add Contact</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="search"
                  defaultValue={params.search}
                  placeholder="Search by name, email, or company..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Stage Filter */}
            <div className="flex gap-2 flex-wrap">
              <Link
                href={buildUrl({ stage: undefined, page: "1" })}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  !params.stage || params.stage === "all"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All
              </Link>
              <Link
                href={buildUrl({ stage: "lead", page: "1" })}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  params.stage === "lead"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Leads
              </Link>
              <Link
                href={buildUrl({ stage: "engaged", page: "1" })}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  params.stage === "engaged"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Engaged
              </Link>
              <Link
                href={buildUrl({ stage: "partner", page: "1" })}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  params.stage === "partner"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Partners
              </Link>
              <Link
                href={buildUrl({ stage: "vip", page: "1" })}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  params.stage === "vip"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                VIPs
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {contacts.length === 0 && (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {params.search || params.stage ? 'No contacts found' : 'No contacts yet'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                {params.search || params.stage 
                  ? 'Try adjusting your filters or search terms.'
                  : 'Import contacts from Luma events or upload a CSV file to get started.'}
              </p>
              {!params.search && !params.stage && (
                <Link
                  href="/import"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Import Contacts
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts Table */}
      {contacts.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    <Link
                      href={buildUrl({
                        sort: "first_name",
                        order: params.sort === "first_name" && params.order !== "asc" ? "asc" : "desc",
                      })}
                      className="hover:text-gray-900"
                    >
                      Contact
                    </Link>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    <Link
                      href={buildUrl({
                        sort: "email",
                        order: params.sort === "email" && params.order !== "asc" ? "asc" : "desc",
                      })}
                      className="hover:text-gray-900"
                    >
                      Email
                    </Link>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Stage</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    <Link
                      href={buildUrl({
                        sort: "lead_score",
                        order: params.sort === "lead_score" && params.order !== "asc" ? "asc" : "desc",
                      })}
                      className="hover:text-gray-900"
                    >
                      Lead Score
                    </Link>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Source</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    <Link
                      href={buildUrl({
                        sort: "created_at",
                        order: params.sort === "created_at" && params.order !== "asc" ? "asc" : "desc",
                      })}
                      className="hover:text-gray-900"
                    >
                      Added
                    </Link>
                  </th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {getInitials(contact.first_name, contact.last_name, contact.email)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {contact.first_name && contact.last_name 
                              ? `${contact.first_name} ${contact.last_name}`
                              : contact.first_name || '—'}
                          </p>
                          {contact.job_title && (
                            <p className="text-xs text-gray-500">{contact.job_title}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">{contact.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">{contact.company || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      {contact.relationship_stage ? (
                        <Badge className={getStageColor(contact.relationship_stage)}>
                          {contact.relationship_stage}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
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
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-500 capitalize">{contact.source || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-500">{formatDate(contact.created_at)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} contacts
            </p>
            <div className="flex gap-2">
              <Link
                href={buildUrl({ page: String(Math.max(1, page - 1)) })}
                className={`p-2 rounded-lg border border-gray-200 ${
                  page <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-gray-50"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {page} of {totalPages || 1}
              </span>
              <Link
                href={buildUrl({ page: String(Math.min(totalPages || 1, page + 1)) })}
                className={`p-2 rounded-lg border border-gray-200 ${
                  page >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-gray-50"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
