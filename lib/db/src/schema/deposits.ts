import { pgTable, serial, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const balanceTypeEnum = pgEnum("balance_type", ["game", "invest"]);
export const depositStatusEnum = pgEnum("deposit_status", ["pending", "confirmed", "rejected"]);

export const depositsTable = pgTable("deposits", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  balanceType: balanceTypeEnum("balance_type").notNull(),
  status: depositStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDepositSchema = createInsertSchema(depositsTable).omit({ id: true, createdAt: true, status: true });
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof depositsTable.$inferSelect;
