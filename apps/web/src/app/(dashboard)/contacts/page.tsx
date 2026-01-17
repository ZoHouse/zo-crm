// Prevent prerendering - database queries at runtime only
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Download, ChevronLeft, ChevronRight, Upload, FilterX } from "lucide-react";
import Link from "next/link";
import { ContactsTable } from "@/components/contacts-table";

// Server-side Supabase client
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key);
}

interface PageProps {
  searchParams: Promise<{
    search?: string;
    stage?: string;
    source?: string;
    company?: string;
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

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

async function getContacts(params: {
  search?: string;
  stage?: string;
  source?: string;
  company?: string;
  page?: number;
  sort?: string;
  order?: string;
}) {
  const supabase = getSupabase();
  const pageSize = 25;
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

  // Apply source filter
  if (params.source) {
    query = query.eq('source', params.source);
  }

  // Apply company filter
  if (params.company) {
    query = query.eq('company', params.company);
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

async function getFilterOptions(): Promise<{
  companies: FilterOption[];
  sources: FilterOption[];
}> {
  const supabase = getSupabase();

  // Get unique companies with counts
  const { data: companyData } = await supabase
    .from('contacts')
    .select('company')
    .not('company', 'is', null)
    .not('company', 'eq', '');

  const companyCounts = new Map<string, number>();
  companyData?.forEach((row) => {
    const company = row.company as string;
    companyCounts.set(company, (companyCounts.get(company) || 0) + 1);
  });

  const companies: FilterOption[] = Array.from(companyCounts.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .slice(0, 50) // Top 50 companies
    .map(([company, count]) => ({
      value: company,
      label: company,
      count,
    }));

  // Get unique sources with counts
  const { data: sourceData } = await supabase
    .from('contacts')
    .select('source')
    .not('source', 'is', null);

  const sourceCounts = new Map<string, number>();
  sourceData?.forEach((row) => {
    const source = row.source as string;
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });

  const sources: FilterOption[] = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      value: source,
      label: source.charAt(0).toUpperCase() + source.slice(1).replace(/_/g, ' '),
      count,
    }));

  return { companies, sources };
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  const [contactsResult, filterOptions] = await Promise.all([
    getContacts({
      search: params.search,
      stage: params.stage,
      source: params.source,
      company: params.company,
      page: params.page ? parseInt(params.page) : 1,
      sort: params.sort,
      order: params.order,
    }),
    getFilterOptions(),
  ]);

  const { contacts, total, page, totalPages } = contactsResult;

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const current = new URLSearchParams();
    if (params.search) current.set("search", params.search);
    if (params.stage) current.set("stage", params.stage);
    if (params.source) current.set("source", params.source);
    if (params.company) current.set("company", params.company);
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

  const hasActiveFilters = params.stage || params.source || params.company;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm md:text-base text-gray-500">{total.toLocaleString()} total contacts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/import">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          {hasActiveFilters && (
            <Link href="/contacts">
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                <FilterX className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Clear Filters</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <form className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="search"
                defaultValue={params.search}
                placeholder="Search by name, email, or company..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </form>
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
                {params.search || hasActiveFilters ? 'No contacts found' : 'No contacts yet'}
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                {params.search || hasActiveFilters
                  ? 'Try adjusting your filters or search terms.'
                  : 'Import contacts from Luma events or upload a CSV file to get started.'}
              </p>
              {!params.search && !hasActiveFilters && (
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

      {/* Contacts Table with Excel-like Filters */}
      {contacts.length > 0 && (
        <Card className="overflow-hidden">
          <ContactsTable
            contacts={contacts}
            uniqueCompanies={filterOptions.companies}
            uniqueSources={filterOptions.sources}
          />

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
              Showing <span className="font-medium">{(page - 1) * 25 + 1}</span> to{" "}
              <span className="font-medium">{Math.min(page * 25, total)}</span> of{" "}
              <span className="font-medium">{total.toLocaleString()}</span> contacts
            </p>
            <div className="flex items-center gap-1">
              <Link
                href={buildUrl({ page: String(Math.max(1, page - 1)) })}
                className={`p-2 rounded-lg border border-gray-200 bg-white ${
                  page <= 1 ? "opacity-50 pointer-events-none" : "hover:bg-gray-50"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
              
              {/* Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Link
                      key={pageNum}
                      href={buildUrl({ page: String(pageNum) })}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        page === pageNum
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>
              
              <span className="sm:hidden px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg">
                {page} / {totalPages || 1}
              </span>
              
              <Link
                href={buildUrl({ page: String(Math.min(totalPages || 1, page + 1)) })}
                className={`p-2 rounded-lg border border-gray-200 bg-white ${
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
