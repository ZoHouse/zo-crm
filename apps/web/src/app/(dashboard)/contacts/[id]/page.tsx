// Prevent prerendering - database queries at runtime only
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  User,
  Tag,
  Clock,
  MessageSquare,
  Phone,
  CheckCircle,
  Building,
  Globe,
  Wallet,
} from "lucide-react";

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
  params: Promise<{ id: string }>;
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
  last_contacted_at: string | null;
  next_followup_at: string | null;
  source: string | null;
  source_detail: string | null;
  telegram: string | null;
  twitter: string | null;
  linkedin: string | null;
  whatsapp: string | null;
  instagram: string | null;
  eth_address: string | null;
  solana_address: string | null;
  luma_user_id: string | null;
  events_attended: number | null;
  total_spent: number | null;
  notes: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ActivityRecord {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  created_at: string | null;
}

interface TagRecord {
  id: string;
  name: string;
  color: string | null;
}

async function getContact(id: string) {
  const supabase = getSupabase();

  // Get contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (contactError || !contact) {
    return null;
  }

  // Get activities
  const { data: activities } = await supabase
    .from('activities')
    .select('id, type, title, content, created_at')
    .eq('contact_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get tags
  const { data: contactTags } = await supabase
    .from('contact_tags')
    .select('tags(id, name, color)')
    .eq('contact_id', id);

  const tags = contactTags?.map((ct: any) => {
    // PostgREST sometimes returns joined data as an array
    if (Array.isArray(ct.tags)) return ct.tags[0];
    return ct.tags;
  }).filter(Boolean) || [];

  return { 
    contact: contact as Contact, 
    activities: (activities || []) as ActivityRecord[], 
    tags: tags as TagRecord[] 
  };
}

const activityIcons: Record<string, typeof Mail> = {
  email: Mail,
  note: MessageSquare,
  call: Phone,
  meeting: Calendar,
  whatsapp: MessageSquare,
  telegram: MessageSquare,
  task: CheckCircle,
  other: Activity,
};

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getContact(id);

  if (!data) {
    notFound();
  }

  const { contact, activities, tags } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/contacts"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white">
            {getInitials(contact.first_name, contact.last_name, contact.email)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {contact.first_name && contact.last_name 
                ? `${contact.first_name} ${contact.last_name}`
                : contact.first_name || contact.email}
            </h1>
            <p className="text-gray-500">{contact.email}</p>
            {contact.relationship_stage && (
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStageColor(contact.relationship_stage)}>
                  {contact.relationship_stage}
                </Badge>
                {contact.company && (
                  <span className="text-sm text-gray-500">{contact.company}</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" size="sm">
            <MessageSquare className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Lead Score</p>
                    <p className="text-lg font-bold text-gray-900">{contact.lead_score ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Spent</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(contact.total_spent || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Events</p>
                    <p className="text-lg font-bold text-gray-900">
                      {contact.events_attended || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Added</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatDate(contact.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Activity Timeline</CardTitle>
                <Button variant="outline" size="sm">
                  Add Activity
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity, idx) => {
                    const Icon = activityIcons[activity.type] || Activity;
                    return (
                      <div key={activity.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-600" />
                          </div>
                          {idx < activities.length - 1 && (
                            <div className="w-px h-full bg-gray-200 my-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {activity.title || activity.type}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(activity.created_at)}
                            </p>
                          </div>
                          {activity.content && (
                            <p className="text-sm text-gray-600 mt-1">
                              {activity.content}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No activities yet</p>
                  <p className="text-sm text-gray-400">
                    Activities will appear here as you interact with this contact
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-sm text-gray-900">
                    {contact.first_name} {contact.last_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{contact.email}</p>
                </div>
              </div>

              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{contact.phone}</p>
                  </div>
                </div>
              )}

              {contact.company && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Company</p>
                    <p className="text-sm text-gray-900">{contact.company}</p>
                  </div>
                </div>
              )}

              {contact.job_title && (
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Job Title</p>
                    <p className="text-sm text-gray-900">{contact.job_title}</p>
                  </div>
                </div>
              )}

              {contact.source && (
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Source</p>
                    <p className="text-sm text-gray-900 capitalize">{contact.source}</p>
                    {contact.source_detail && (
                      <p className="text-xs text-gray-500">{contact.source_detail}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Added to CRM</p>
                  <p className="text-sm text-gray-900">{formatDate(contact.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social & Web3 */}
          {(contact.telegram || contact.twitter || contact.linkedin || contact.eth_address) && (
            <Card>
              <CardHeader>
                <CardTitle>Social & Web3</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.telegram && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Telegram</span>
                    <span className="text-sm text-gray-900">@{contact.telegram}</span>
                  </div>
                )}
                {contact.twitter && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Twitter</span>
                    <span className="text-sm text-gray-900">@{contact.twitter}</span>
                  </div>
                )}
                {contact.linkedin && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">LinkedIn</span>
                    <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View</a>
                  </div>
                )}
                {contact.eth_address && (
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">ETH Address</p>
                      <p className="text-sm text-gray-900 font-mono truncate">{contact.eth_address}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge 
                      key={tag.id} 
                      variant="secondary"
                      style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined, color: tag.color || undefined }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up */}
          {contact.next_followup_at && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader>
                <CardTitle className="text-yellow-800">Follow-up Due</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-700">{formatDate(contact.next_followup_at)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
