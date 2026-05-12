import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investmentStatusEnum = pgEnum("investment_status", ["active", "completed"]);

export const investmentsTable = pgTable("investments", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  profitRate: numeric("profit_rate", { precision: 5, scale: 2 }).notNull(),
  dailyProfit: numeric("daily_profit", { precision: 15, scale: 2 }).notNull(),
  totalEarned: numeric("total_earned", { precision: 15, scale: 2 }).notNull().default("0"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at").notNull(),
  lastProfitAt: timestamp("last_profit_at"),
  status: investmentStatusEnum("status").notNull().default("active"),
});

export const insertInvestmentSchema = createInsertSchema(investmentsTable).omit({ id: true, totalEarned: true, lastProfitAt: true, status: true });
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investmentsTable.$inferSelect;
