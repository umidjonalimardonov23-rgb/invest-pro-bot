import { Router } from "express";
import { db, investmentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { GetInvestmentsQueryParams, CreateInvestmentBody } from "@workspace/api-zod";

const router = Router();

function getProfitRate(amount: number): number {
  if (amount >= 2_000_000) return 3.5;
  if (amount >= 1_000_000) return 3.0;
  if (amount >= 500_000) return 2.5;
  if (amount >= 200_000) return 2.0;
  return 1.5;
}

function formatInvestment(inv: typeof investmentsTable.$inferSelect) {
  return {
    id: inv.id,
    telegramId: inv.telegramId,
    amount: Number(inv.amount),
    durationDays: inv.durationDays,
    profitRate: Number(inv.profitRate),
    dailyProfit: Number(inv.dailyProfit),
    totalEarned: Number(inv.totalEarned),
    startedAt: inv.startedAt,
    endsAt: inv.endsAt,
    lastProfitAt: inv.lastProfitAt,
    status: inv.status,
  };
}

router.get("/investments", async (req, res) => {
  const params = GetInvestmentsQueryParams.safeParse(req.query);
  if (!params.success) return res.status(400).json({ error: "Invalid query" });

  const investments = await db.select().from(investmentsTable).where(eq(investmentsTable.telegramId, params.data.telegramId));
  res.json(investments.map(formatInvestment));
});

router.post("/investments", async (req, res) => {
  const parsed = CreateInvestmentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { telegramId, amount, durationDays } = parsed.data;

  if (amount < 50_000) return res.status(400).json({ error: "Minimal investitsiya 50,000 so'm" });
  if (durationDays < 5 || durationDays > 30) return res.status(400).json({ error: "Muddat 5-30 kun oralig'ida bo'lishi kerak" });

  const user = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  if (!user[0]) return res.status(404).json({ error: "User not found" });
  if (Number(user[0].investBalance) < amount) return res.status(400).json({ error: "Investitsiya balansida mablag' yetarli emas" });

  const profitRate = getProfitRate(amount);
  const dailyProfit = (amount * profitRate) / 100;
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Deduct from invest balance
  const newBalance = Number(user[0].investBalance) - amount;
  await db.update(usersTable).set({ investBalance: String(newBalance) }).where(eq(usersTable.telegramId, telegramId));

  const inserted = await db.insert(investmentsTable).values({
    telegramId,
    amount: String(amount),
    durationDays,
    profitRate: String(profitRate),
    dailyProfit: String(dailyProfit),
    startedAt,
    endsAt,
  }).returning();

  res.status(201).json(formatInvestment(inserted[0]));
});

export default router;
