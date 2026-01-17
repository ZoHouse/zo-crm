"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Filter,
  X,
  Check,
} from "lucide-react";

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

interface ColumnHeaderProps {
  label: string;
  sortKey?: string;
  currentSort?: string;
  currentOrder?: string;
  filterKey?: string;
  filterOptions?: FilterOption[];
  currentFilter?: string;
  onSort?: (key: string, order: string) => void;
  onFilter?: (key: string, value: string | null) => void;
}

function ColumnHeader({
  label,
  sortKey,
  currentSort,
  currentOrder,
  filterKey,
  filterOptions,
  currentFilter,
  onSort,
  onFilter,
}: ColumnHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSorted = currentSort === sortKey;
  const isFiltered = currentFilter && currentFilter !== "all";
  const isActive = isSorted || isFiltered;

  return (
    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 relative">
      <div ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 hover:text-gray-900 transition-colors ${
            isActive ? "text-blue-600" : ""
          }`}
        >
          <span>{label}</span>
          {sortKey && (
            <span className="flex items-center">
              {isSorted ? (
                currentOrder === "asc" ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
              )}
            </span>
          )}
          {filterKey && filterOptions && (
            <Filter
              className={`w-3.5 h-3.5 ${isFiltered ? "text-blue-600" : "opacity-40"}`}
            />
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (sortKey || filterOptions) && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
            {/* Sort Options */}
            {sortKey && onSort && (
              <>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Sort
                </div>
                <button
                  onClick={() => {
                    onSort(sortKey, "asc");
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    isSorted && currentOrder === "asc" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ChevronUp className="w-4 h-4" />
                    Sort A → Z
                  </span>
                  {isSorted && currentOrder === "asc" && <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    onSort(sortKey, "desc");
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    isSorted && currentOrder === "desc" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4" />
                    Sort Z → A
                  </span>
                  {isSorted && currentOrder === "desc" && <Check className="w-4 h-4" />}
                </button>
              </>
            )}

            {/* Filter Options */}
            {filterKey && filterOptions && onFilter && (
              <>
                {sortKey && <div className="border-t border-gray-100 my-1" />}
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Filter
                </div>
                <button
                  onClick={() => {
                    onFilter(filterKey, null);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    !currentFilter || currentFilter === "all" ? "bg-blue-50 text-blue-600" : ""
                  }`}
                >
                  <span>All</span>
                  {(!currentFilter || currentFilter === "all") && <Check className="w-4 h-4" />}
                </button>
                <div className="max-h-48 overflow-y-auto">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onFilter(filterKey, option.value);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                        currentFilter === option.value ? "bg-blue-50 text-blue-600" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {option.label}
                        {option.count !== undefined && (
                          <span className="text-xs text-gray-400">({option.count})</span>
                        )}
                      </span>
                      {currentFilter === option.value && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Clear Filter */}
            {isFiltered && filterKey && onFilter && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => {
                    onFilter(filterKey, null);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear Filter
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </th>
  );
}

interface ContactsTableProps {
  contacts: Contact[];
  uniqueCompanies: FilterOption[];
  uniqueSources: FilterOption[];
}

export function ContactsTable({
  contacts,
  uniqueCompanies,
  uniqueSources,
}: ContactsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") || "";
  const currentOrder = searchParams.get("order") || "desc";
  const currentStage = searchParams.get("stage") || "";
  const currentSource = searchParams.get("source") || "";
  const currentCompany = searchParams.get("company") || "";

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    // Reset to page 1 when filtering
    if (!updates.hasOwnProperty("page")) {
      params.set("page", "1");
    }
    router.push(`/contacts?${params.toString()}`);
  };

  const handleSort = (key: string, order: string) => {
    updateParams({ sort: key, order });
  };

  const handleFilter = (key: string, value: string | null) => {
    updateParams({ [key]: value });
  };

  const stageOptions: FilterOption[] = [
    { value: "lead", label: "Lead" },
    { value: "engaged", label: "Engaged" },
    { value: "partner", label: "Partner" },
    { value: "vip", label: "VIP" },
    { value: "inactive", label: "Inactive" },
  ];

  const formatDate = (date: string | null): string => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (
    firstName?: string | null,
    lastName?: string | null,
    email?: string
  ): string => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "??";
  };

  const getStageColor = (stage: string | null): string => {
    switch (stage) {
      case "lead":
        return "bg-blue-100 text-blue-700";
      case "engaged":
        return "bg-green-100 text-green-700";
      case "partner":
        return "bg-purple-100 text-purple-700";
      case "vip":
        return "bg-yellow-100 text-yellow-700";
      case "inactive":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  // Active filters display
  const activeFilters = [
    currentStage && { key: "stage", label: `Stage: ${currentStage}` },
    currentSource && { key: "source", label: `Source: ${currentSource}` },
    currentCompany && { key: "company", label: `Company: ${currentCompany}` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div>
      {/* Active Filters Bar */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-100">
          <span className="text-sm text-blue-600 font-medium">Active filters:</span>
          {activeFilters.map((filter) => (
            <span
              key={filter.key}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded-full text-xs text-blue-700"
            >
              {filter.label}
              <button
                onClick={() => handleFilter(filter.key, null)}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={() => {
              updateParams({ stage: null, source: null, company: null });
            }}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <ColumnHeader
                label="Contact"
                sortKey="first_name"
                currentSort={currentSort}
                currentOrder={currentOrder}
                onSort={handleSort}
              />
              <ColumnHeader
                label="Email"
                sortKey="email"
                currentSort={currentSort}
                currentOrder={currentOrder}
                onSort={handleSort}
              />
              <ColumnHeader
                label="Company"
                sortKey="company"
                currentSort={currentSort}
                currentOrder={currentOrder}
                filterKey="company"
                filterOptions={uniqueCompanies}
                currentFilter={currentCompany}
                onSort={handleSort}
                onFilter={handleFilter}
              />
              <ColumnHeader
                label="Stage"
                filterKey="stage"
                filterOptions={stageOptions}
                currentFilter={currentStage}
                onFilter={handleFilter}
              />
              <ColumnHeader
                label="Lead Score"
                sortKey="lead_score"
                currentSort={currentSort}
                currentOrder={currentOrder}
                onSort={handleSort}
              />
              <ColumnHeader
                label="Source"
                filterKey="source"
                filterOptions={uniqueSources}
                currentFilter={currentSource}
                onFilter={handleFilter}
              />
              <ColumnHeader
                label="Events"
                sortKey="events_attended"
                currentSort={currentSort}
                currentOrder={currentOrder}
                onSort={handleSort}
              />
              <ColumnHeader
                label="Added"
                sortKey="created_at"
                currentSort={currentSort}
                currentOrder={currentOrder}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-medium text-white">
                      {getInitials(
                        contact.first_name,
                        contact.last_name,
                        contact.email
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {contact.first_name && contact.last_name
                          ? `${contact.first_name} ${contact.last_name}`
                          : contact.first_name || "—"}
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
                  <p className="text-sm text-gray-600">{contact.company || "—"}</p>
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
                  <p className="text-sm text-gray-500 capitalize">
                    {contact.source || "—"}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <p className="text-sm text-gray-600 font-medium">
                    {contact.events_attended || 0}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <p className="text-sm text-gray-500">
                    {formatDate(contact.created_at)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
