import { Router } from "express";
import { db, gameBetsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { PlayGameBody, GetGameHistoryQueryParams } from "@workspace/api-zod";

const router = Router();

const MIN_BET = 2000;

// Win probability based on bet amount (bigger bet = lower win chance)
function getWinProbability(betAmount: number, gameBalance: number): number {
  const ratio = betAmount / gameBalance;
  // Base 25% win rate, decreasing as bet ratio increases
  const base = 0.25;
  const penalty = Math.min(ratio * 0.3, 0.20); // up to 20% extra penalty
  return Math.max(base - penalty, 0.05);
}

function getMultiplier(gameType: string, won: boolean): number {
  const multipliers: Record<string, [number, number]> = {
    crash: [1.5, 3.0],
    dice: [1.8, 2.5],
    slots: [2.0, 5.0],
    roulette: [1.9, 2.0],
    mines: [1.6, 4.0],
    wheel: [1.5, 6.0],
    coinflip: [1.9, 1.9],
    blackjack: [1.8, 2.2],
    plinko: [1.4, 8.0],
    keno: [1.7, 3.5],
  };
  const [low, high] = multipliers[gameType] ?? [1.5, 3.0];
  if (!won) return 0;
  return Math.round((low + Math.random() * (high - low)) * 100) / 100;
}

router.post("/games/play", async (req, res) => {
  const parsed = PlayGameBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { telegramId, gameType, betAmount } = parsed.data;

  if (betAmount < MIN_BET) return res.status(400).json({ error: `Minimal stavka ${MIN_BET.toLocaleString()} so'm` });

  const user = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  if (!user[0]) return res.status(404).json({ error: "User not found" });

  const gameBalance = Number(user[0].gameBalance);
  if (gameBalance < betAmount) return res.status(400).json({ error: "O'yin balansida mablag' yetarli emas" });

  // Server-side win/loss determination
  const winProb = getWinProbability(betAmount, gameBalance);
  const won = Math.random() < winProb;
  const multiplier = getMultiplier(gameType, won);
  const payout = won ? Math.floor(betAmount * multiplier) : 0;
  const newBalance = gameBalance - betAmount + payout;

  await db.update(usersTable).set({ gameBalance: String(Math.max(0, newBalance)) }).where(eq(usersTable.telegramId, telegramId));
  await db.insert(gameBetsTable).values({
    telegramId,
    gameType,
    betAmount: String(betAmount),
    multiplier: String(multiplier),
    won,
    payout: String(payout),
  });

  res.json({ won, multiplier, payout, newGameBalance: Math.max(0, newBalance) });
});

router.get("/games/history", async (req, res) => {
  const params = GetGameHistoryQueryParams.safeParse(req.query);
  if (!params.success) return res.status(400).json({ error: "Invalid query" });

  const limit = params.data.limit ?? 20;
  const bets = await db.select().from(gameBetsTable)
    .where(eq(gameBetsTable.telegramId, params.data.telegramId))
    .orderBy(gameBetsTable.createdAt)
    .limit(limit);

  res.json(bets.map(b => ({
    id: b.id,
    telegramId: b.telegramId,
    gameType: b.gameType,
    betAmount: Number(b.betAmount),
    multiplier: Number(b.multiplier),
    won: b.won,
    payout: Number(b.payout),
    createdAt: b.createdAt,
  })));
});

export default router;
