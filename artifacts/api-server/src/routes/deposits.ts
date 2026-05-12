import { Router } from "express";
import { db, depositsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateDepositBody, ConfirmDepositParams, ConfirmDepositBody, RejectDepositParams } from "@workspace/api-zod";
import { notifyUser } from "../bot/notify.js";

const router = Router();

function formatDeposit(d: typeof depositsTable.$inferSelect) {
  return { id: d.id, telegramId: d.telegramId, amount: Number(d.amount), balanceType: d.balanceType, status: d.status, createdAt: d.createdAt };
}

router.post("/deposits", async (req, res) => {
  const parsed = CreateDepositBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { telegramId, amount, balanceType } = parsed.data;

  if (amount < 2000) return res.status(400).json({ error: "Minimal summa 2,000 so'm" });

  const inserted = await db.insert(depositsTable).values({ telegramId, amount: String(amount), balanceType }).returning();
  res.status(201).json(formatDeposit(inserted[0]));
});

router.post("/deposits/:id/confirm", async (req, res) => {
  const params = ConfirmDepositParams.safeParse({ id: Number(req.params.id) });
  const body = ConfirmDepositBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid input" });

  const deposit = await db.select().from(depositsTable).where(eq(depositsTable.id, params.data.id)).limit(1);
  if (!deposit[0]) return res.status(404).json({ error: "Deposit not found" });
  if (deposit[0].status !== "pending") return res.status(400).json({ error: "Already processed" });

  const d = deposit[0];
  const amount = body.data.amount;

  await db.update(depositsTable).set({ status: "confirmed", amount: String(amount) }).where(eq(depositsTable.id, d.id));

  // Credit the right balance
  const user = await db.select().from(usersTable).where(eq(usersTable.telegramId, d.telegramId)).limit(1);
  if (user[0]) {
    if (d.balanceType === "game") {
      const newBal = Number(user[0].gameBalance) + amount;
      await db.update(usersTable).set({ gameBalance: String(newBal) }).where(eq(usersTable.telegramId, d.telegramId));
    } else {
      const newBal = Number(user[0].investBalance) + amount;
      await db.update(usersTable).set({ investBalance: String(newBal) }).where(eq(usersTable.telegramId, d.telegramId));
    }
  }

  const balLabel = d.balanceType === "game" ? "O'yin balansi" : "Investitsiya balansi";
  await notifyUser(d.telegramId, `✅ Tabriklaymiz! ${amount.toLocaleString()} so'm ${balLabel}ingizga tushdi! 💰`);

  const updated = await db.select().from(depositsTable).where(eq(depositsTable.id, d.id)).limit(1);
  res.json(formatDeposit(updated[0]));
});

router.post("/deposits/:id/reject", async (req, res) => {
  const params = RejectDepositParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid input" });

  const deposit = await db.select().from(depositsTable).where(eq(depositsTable.id, params.data.id)).limit(1);
  if (!deposit[0]) return res.status(404).json({ error: "Deposit not found" });

  await db.update(depositsTable).set({ status: "rejected" }).where(eq(depositsTable.id, params.data.id));
  await notifyUser(deposit[0].telegramId, `❌ To'lov so'rovingiz rad etildi. Batafsil ma'lumot uchun adminga murojaat qiling.`);

  const updated = await db.select().from(depositsTable).where(eq(depositsTable.id, params.data.id)).limit(1);
  res.json(formatDeposit(updated[0]));
});

export default router;
