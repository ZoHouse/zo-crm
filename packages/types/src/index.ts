// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Contact types
export interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string;
  userApiId: string | null;
  firstSeen: string | null;
  revenue: number;
  leadScore: number;
  tags: string[] | null;
  membershipName: string | null;
  membershipStatus: string | null;
  eventApprovedCount: number;
  eventCheckedInCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactFilters {
  search?: string;
  membershipStatus?: string;
  minLeadScore?: number;
  maxLeadScore?: number;
  hasRevenue?: boolean;
  sortBy?: keyof Contact;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// Activity types
export type ActivityType = "email" | "note" | "call" | "event" | "system";

export interface Activity {
  id: string;
  contactId: string;
  type: ActivityType;
  content: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NewActivity {
  contactId: string;
  type: ActivityType;
  content?: string;
  metadata?: Record<string, unknown>;
}

// AI Insight types
export type InsightType = "churn_risk" | "engagement" | "recommendation";

export interface AiInsight {
  id: string;
  contactId: string;
  type: InsightType;
  content: string;
  confidenceScore: number | null;
  generatedAt: string;
}

// Dashboard stats
export interface DashboardStats {
  totalContacts: number;
  activeMembers: number;
  pendingMembers: number;
  totalRevenue: number;
  avgLeadScore: number;
  recentActivityCount: number;
  membershipBreakdown: {
    name: string;
    count: number;
  }[];
  engagementTrend: {
    date: string;
    newContacts: number;
  }[];
}
