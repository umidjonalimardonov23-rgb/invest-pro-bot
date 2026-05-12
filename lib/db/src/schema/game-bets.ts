import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gameBetsTable = pgTable("game_bets", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  gameType: text("game_type").notNull(),
  betAmount: numeric("bet_amount", { precision: 15, scale: 2 }).notNull(),
  multiplier: numeric("multiplier", { precision: 8, scale: 2 }).notNull(),
  won: boolean("won").notNull(),
  payout: numeric("payout", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGameBetSchema = createInsertSchema(gameBetsTable).omit({ id: true, createdAt: true });
export type InsertGameBet = z.infer<typeof insertGameBetSchema>;
export type GameBet = typeof gameBetsTable.$inferSelect;
