import { getDb, schema } from "@/lib/db";
import { desc, asc, like, or, eq, sql, count } from "drizzle-orm";

// Prevent prerendering - database not available at build time on Vercel
export const dynamic = 'force-dynamic';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate, getInitials, getMembershipStatusColor } from "@/lib/utils";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    sort?: string;
    order?: string;
  }>;
}

async function getContacts(params: {
  search?: string;
  status?: string;
  page?: number;
  sort?: string;
  order?: string;
}) {
  const db = getDb();
  const pageSize = 20;
  const page = params.page || 1;
  const offset = (page - 1) * pageSize;

  let query = db.select().from(schema.contacts).$dynamic();

  // Apply search filter
  if (params.search) {
    const searchTerm = `%${params.search}%`;
    query = query.where(
      or(
        like(schema.contacts.name, searchTerm),
        like(schema.contacts.email, searchTerm),
        like(schema.contacts.firstName, searchTerm),
        like(schema.contacts.lastName, searchTerm)
      )
    );
  }

  // Apply status filter
  if (params.status && params.status !== "all") {
    if (params.status === "none") {
      query = query.where(sql`${schema.contacts.membershipStatus} IS NULL OR ${schema.contacts.membershipStatus} = ''`);
    } else {
      query = query.where(eq(schema.contacts.membershipStatus, params.status));
    }
  }

  // Get total count for pagination
  const countQuery = db
    .select({ count: count() })
    .from(schema.contacts)
    .$dynamic();

  if (params.search) {
    const searchTerm = `%${params.search}%`;
    countQuery.where(
      or(
        like(schema.contacts.name, searchTerm),
        like(schema.contacts.email, searchTerm),
        like(schema.contacts.firstName, searchTerm),
        like(schema.contacts.lastName, searchTerm)
      )
    );
  }

  if (params.status && params.status !== "all") {
    if (params.status === "none") {
      countQuery.where(sql`${schema.contacts.membershipStatus} IS NULL OR ${schema.contacts.membershipStatus} = ''`);
    } else {
      countQuery.where(eq(schema.contacts.membershipStatus, params.status));
    }
  }

  const [{ count: total }] = await countQuery;

  // Apply sorting
  const sortColumn = params.sort || "createdAt";
  const sortOrder = params.order === "asc" ? asc : desc;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortableColumns: Record<string, any> = {
    createdAt: schema.contacts.createdAt,
    name: schema.contacts.name,
    email: schema.contacts.email,
    leadScore: schema.contacts.leadScore,
    firstSeen: schema.contacts.firstSeen,
    revenue: schema.contacts.revenue,
  };

  const orderByColumn = sortableColumns[sortColumn] || schema.contacts.createdAt;
  query = query.orderBy(sortOrder(orderByColumn));

  // Apply pagination
  query = query.limit(pageSize).offset(offset);

  const contacts = await query;

  return {
    contacts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { contacts, total, page, totalPages } = await getContacts({
    search: params.search,
    status: params.status,
    page: params.page ? parseInt(params.page) : 1,
    sort: params.sort,
    order: params.order,
  });

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const current = new URLSearchParams();
    if (params.search) current.set("search", params.search);
    if (params.status) current.set("status", params.status);
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
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>

            {/* Status Filter */}
            <div className="flex gap-2">
              <Link
                href={buildUrl({ status: undefined, page: "1" })}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  !params.status || params.status === "all"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All
              </Link>
              <Link
                href={buildUrl({ status: "active", page: "1" })}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  params.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Active
              </Link>
              <Link
                href={buildUrl({ status: "pending", page: "1" })}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  params.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Pending
              </Link>
              <Link
                href={buildUrl({ status: "none", page: "1" })}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  params.status === "none"
                    ? "bg-gray-200 text-gray-800"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                No Status
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  <Link
                    href={buildUrl({
                      sort: "name",
                      order: params.sort === "name" && params.order !== "asc" ? "asc" : "desc",
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  <Link
                    href={buildUrl({
                      sort: "leadScore",
                      order: params.sort === "leadScore" && params.order !== "asc" ? "asc" : "desc",
                    })}
                    className="hover:text-gray-900"
                  >
                    Lead Score
                  </Link>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  <Link
                    href={buildUrl({
                      sort: "firstSeen",
                      order: params.sort === "firstSeen" && params.order !== "asc" ? "asc" : "desc",
                    })}
                    className="hover:text-gray-900"
                  >
                    First Seen
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
                        {getInitials(contact.name, contact.email)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {contact.name || "—"}
                        </p>
                        {contact.membershipName && (
                          <p className="text-xs text-gray-500">{contact.membershipName}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-gray-600">{contact.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    {contact.membershipStatus ? (
                      <Badge
                        className={getMembershipStatusColor(contact.membershipStatus)}
                      >
                        {contact.membershipStatus}
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
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
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-gray-500">{formatDate(contact.firstSeen)}</p>
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
              Page {page} of {totalPages}
            </span>
            <Link
              href={buildUrl({ page: String(Math.min(totalPages, page + 1)) })}
              className={`p-2 rounded-lg border border-gray-200 ${
                page >= totalPages ? "opacity-50 pointer-events-none" : "hover:bg-gray-50"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
