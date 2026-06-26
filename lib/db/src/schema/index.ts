import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailAlertsTable = pgTable("email_alerts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  state: text("state"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEmailAlertSchema = createInsertSchema(emailAlertsTable).omit({ id: true, createdAt: true });
export type InsertEmailAlert = z.infer<typeof insertEmailAlertSchema>;
export type EmailAlert = typeof emailAlertsTable.$inferSelect;

export const searchSubmissionsTable = pgTable("search_submissions", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  state: text("state"),
  birthYear: integer("birth_year"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSearchSubmissionSchema = createInsertSchema(searchSubmissionsTable).omit({ id: true, createdAt: true });
export type InsertSearchSubmission = z.infer<typeof insertSearchSubmissionSchema>;
export type SearchSubmission = typeof searchSubmissionsTable.$inferSelect;

export const financeEnquiriesTable = pgTable("finance_enquiries", {
  id: serial("id").primaryKey(),
  loanType: text("loan_type").notNull(),
  loanAmount: integer("loan_amount").notNull(),
  preferredTerm: integer("preferred_term").notNull(),
  estimatedMonthly: integer("estimated_monthly"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  postcode: text("postcode").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFinanceEnquirySchema = createInsertSchema(financeEnquiriesTable).omit({ id: true, createdAt: true });
export type InsertFinanceEnquiry = z.infer<typeof insertFinanceEnquirySchema>;
export type FinanceEnquiry = typeof financeEnquiriesTable.$inferSelect;

export const miaResearchRequestsTable = pgTable("mia_research_requests", {
  id: serial("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  email: text("email").notNull(),
  customerName: text("customer_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  dob: text("dob"),
  currentAddress: text("current_address"),
  previousAddresses: text("previous_addresses"),
  previousSurnames: text("previous_surnames"),
  reportSentAt: timestamp("report_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMiaResearchRequestSchema = createInsertSchema(miaResearchRequestsTable).omit({ id: true, createdAt: true, reportSentAt: true });
export type InsertMiaResearchRequest = z.infer<typeof insertMiaResearchRequestSchema>;
export type MiaResearchRequest = typeof miaResearchRequestsTable.$inferSelect;

export const tiktokLeadsTable = pgTable("tiktok_leads", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dob: text("dob").notNull(),
  email: text("email"),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTiktokLeadSchema = createInsertSchema(tiktokLeadsTable).omit({ id: true, createdAt: true });
export type InsertTiktokLead = z.infer<typeof insertTiktokLeadSchema>;
export type TiktokLead = typeof tiktokLeadsTable.$inferSelect;

export const miaFreeSearchesTable = pgTable("mia_free_searches", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dob: text("dob").notNull(),
  currentAddress: text("current_address").notNull(),
  previousAddresses: text("previous_addresses"),
  previousSurnames: text("previous_surnames"),
  status: text("status").notNull().default("searching"),
  totalAmountCents: integer("total_amount_cents"),
  teaserMatchesJson: text("teaser_matches_json"),
  stripeSessionId: text("stripe_session_id"),
  reportSentAt: timestamp("report_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type MiaFreeSearch = typeof miaFreeSearchesTable.$inferSelect;

export const prospectsTable = pgTable("prospects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: text("amount").notNull(),
  holder: text("holder"),
  state: text("state"),
  source: text("source").notNull(),
  sourceKey: text("source_key").notNull(),
  letter: text("letter").notNull(),
  contactStatus: text("contact_status").notNull().default("pending"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactAddress: text("contact_address"),
  contactSource: text("contact_source"),
  contactSearchedAt: timestamp("contact_searched_at"),
  outreachSentAt: timestamp("outreach_sent_at"),
  stripeSessionId: text("stripe_session_id"),
  outreachSubject: text("outreach_subject"),
  outreachBodyText: text("outreach_body_text"),
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
});

export type Prospect = typeof prospectsTable.$inferSelect;

export const unsubscribesTable = pgTable("unsubscribes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  unsubscribedAt: timestamp("unsubscribed_at").notNull().defaultNow(),
  prospectId: integer("prospect_id"),
  reason: text("reason"),
});

export type Unsubscribe = typeof unsubscribesTable.$inferSelect;

export const alphabetCrawlProgressTable = pgTable("alphabet_crawl_progress", {
  letter: text("letter").primaryKey(),
  status: text("status").notNull().default("pending"),
  prospectCount: integer("prospect_count").notNull().default(0),
  contactsFound: integer("contacts_found").notNull().default(0),
  outreachSent: integer("outreach_sent").notNull().default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export type AlphabetCrawlProgress = typeof alphabetCrawlProgressTable.$inferSelect;

export const pageViewsTable = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const miaMemoriesTable = pgTable("mia_memories", {
  sessionId: text("session_id").primaryKey(),
  email: text("email"),
  memories: text("memories").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MiaMemory = typeof miaMemoriesTable.$inferSelect;

export const autoSearchResultsTable = pgTable("auto_search_results", {
  id: serial("id").primaryKey(),
  sourceTable: text("source_table").notNull(),
  sourceId: integer("source_id").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  freeSearchId: integer("free_search_id"),
  status: text("status").notNull().default("searching"),
  totalAmountCents: integer("total_amount_cents"),
  searchedAt: timestamp("searched_at").notNull().defaultNow(),
});

export type AutoSearchResult = typeof autoSearchResultsTable.$inferSelect;
