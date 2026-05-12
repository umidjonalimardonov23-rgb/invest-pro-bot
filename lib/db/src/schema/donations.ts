import { pgTable, serial, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teamEnum = pgEnum("team", ["real_madrid", "barcelona"]);
export const donationSourceEnum = pgEnum("donation_source", ["balance", "receipt"]);
export const donationStatusEnum = pgEnum("donation_status", ["pending", "confirmed"]);

export const donationsTable = pgTable("donations", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  team: teamEnum("team").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  source: donationSourceEnum("source").notNull(),
  status: donationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDonationSchema = createInsertSchema(donationsTable).omit({ id: true, status: true, createdAt: true });
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donationsTable.$inferSelect;
