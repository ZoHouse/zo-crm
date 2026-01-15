import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  name: text("name"),
  email: text("email").notNull(),
  userApiId: text("user_api_id"),
  firstSeen: text("first_seen"),
  revenue: real("revenue").default(0),
  leadScore: integer("lead_score").default(0),
  tags: text("tags"), // JSON array stored as text
  membershipName: text("membership_name"),
  membershipStatus: text("membership_status"),
  eventApprovedCount: integer("event_approved_count").default(0),
  eventCheckedInCount: integer("event_checked_in_count").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // email, note, call, event, system
  content: text("content"),
  metadata: text("metadata"), // JSON stored as text
  createdAt: text("created_at").notNull(),
});

export const aiInsights = sqliteTable("ai_insights", {
  id: text("id").primaryKey(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // churn_risk, engagement, recommendation
  content: text("content").notNull(),
  confidenceScore: real("confidence_score"),
  generatedAt: text("generated_at").notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type AiInsight = typeof aiInsights.$inferSelect;
export type NewAiInsight = typeof aiInsights.$inferInsert;
