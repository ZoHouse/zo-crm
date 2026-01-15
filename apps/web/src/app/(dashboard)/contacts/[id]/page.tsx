import { getDb, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
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
  Sparkles,
  MoreVertical,
} from "lucide-react";
import {
  formatDate,
  formatCurrency,
  getInitials,
  getLeadScoreColor,
  getMembershipStatusColor,
} from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getContact(id: string) {
  const db = getDb();

  const [contact] = await db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.id, id))
    .limit(1);

  if (!contact) return null;

  const activities = await db
    .select()
    .from(schema.activities)
    .where(eq(schema.activities.contactId, id))
    .orderBy(desc(schema.activities.createdAt))
    .limit(20);

  const insights = await db
    .select()
    .from(schema.aiInsights)
    .where(eq(schema.aiInsights.contactId, id))
    .orderBy(desc(schema.aiInsights.generatedAt))
    .limit(5);

  return { contact, activities, insights };
}

const activityIcons: Record<string, typeof Mail> = {
  email: Mail,
  note: MessageSquare,
  call: Phone,
  event: CheckCircle,
  system: Activity,
};

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getContact(id);

  if (!data) {
    notFound();
  }

  const { contact, activities, insights } = data;
  const tags = contact.tags ? JSON.parse(contact.tags) : [];

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
            {getInitials(contact.name, contact.email)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {contact.name || contact.email}
            </h1>
            <p className="text-gray-500">{contact.email}</p>
            {contact.membershipName && (
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getMembershipStatusColor(contact.membershipStatus)}>
                  {contact.membershipStatus || "No status"}
                </Badge>
                <span className="text-sm text-gray-500">{contact.membershipName}</span>
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
            Note
          </Button>
          <Button size="sm">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Insights
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
                    <p className="text-lg font-bold text-gray-900">{contact.leadScore}</p>
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
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(contact.revenue || 0)}
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
                      {contact.eventCheckedInCount || 0}
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
                    <p className="text-xs text-gray-500">First Seen</p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatDate(contact.firstSeen)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                              {activity.type}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(activity.createdAt)}
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
                    {contact.firstName} {contact.lastName}
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

              {contact.userApiId && (
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">User ID</p>
                    <p className="text-sm text-gray-900 font-mono text-xs">
                      {contact.userApiId}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Added to CRM</p>
                  <p className="text-sm text-gray-900">{formatDate(contact.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  AI Insights
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {insights.length > 0 ? (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="p-3 rounded-lg bg-blue-50 border border-blue-100"
                    >
                      <p className="text-sm text-blue-900">{insight.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="default" className="text-xs">
                          {insight.type.replace("_", " ")}
                        </Badge>
                        {insight.confidenceScore && (
                          <span className="text-xs text-blue-600">
                            {Math.round(insight.confidenceScore * 100)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No AI insights yet</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Generate Insights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
