import { Router } from "express";
import { db, donationsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreateDonationBody, ConfirmDonationParams } from "@workspace/api-zod";
import { notifyUser } from "../bot/notify.js";

const router = Router();
const MIN_DONATION = 2_000_000;

function formatDonation(d: typeof donationsTable.$inferSelect) {
  return { id: d.id, telegramId: d.telegramId, team: d.team, amount: Number(d.amount), source: d.source, status: d.status, createdAt: d.createdAt };
}

router.get("/donations", async (req, res) => {
  const all = await db.select().from(donationsTable).where(eq(donationsTable.status, "confirmed")).orderBy(donationsTable.createdAt);

  const realMadridTotal = all.filter(d => d.team === "real_madrid").reduce((sum, d) => sum + Number(d.amount), 0);
  const barcelonaTotal = all.filter(d => d.team === "barcelona").reduce((sum, d) => sum + Number(d.amount), 0);
  const recent = all.slice(-10).reverse().map(formatDonation);

  res.json({ realMadridTotal, barcelonaTotal, recent });
});

router.post("/donations", async (req, res) => {
  const parsed = CreateDonationBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { telegramId, team, amount, source } = parsed.data;

  if (amount < MIN_DONATION) return res.status(400).json({ error: `Minimal danat ${MIN_DONATION.toLocaleString()} so'm` });

  if (source === "balance") {
    const user = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
    if (!user[0]) return res.status(404).json({ error: "User not found" });
    if (Number(user[0].gameBalance) < amount) return res.status(400).json({ error: "Balansda mablag' yetarli emas" });

    // Deduct from game balance
    const newBal = Number(user[0].gameBalance) - amount;
    await db.update(usersTable).set({ gameBalance: String(newBal) }).where(eq(usersTable.telegramId, telegramId));

    // Auto-confirm balance donations
    const inserted = await db.insert(donationsTable).values({ telegramId, team, amount: String(amount), source, status: "confirmed" }).returning();
    return res.status(201).json(formatDonation(inserted[0]));
  }

  // Receipt - pending admin confirmation
  const inserted = await db.insert(donationsTable).values({ telegramId, team, amount: String(amount), source }).returning();
  res.status(201).json(formatDonation(inserted[0]));
});

router.post("/donations/:id/confirm", async (req, res) => {
  const params = ConfirmDonationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) return res.status(400).json({ error: "Invalid" });

  const donation = await db.select().from(donationsTable).where(eq(donationsTable.id, params.data.id)).limit(1);
  if (!donation[0]) return res.status(404).json({ error: "Not found" });

  await db.update(donationsTable).set({ status: "confirmed" }).where(eq(donationsTable.id, params.data.id));

  const teamName = donation[0].team === "real_madrid" ? "Real Madrid" : "Barcelona";
  await notifyUser(donation[0].telegramId, `✅ ${teamName}ga danat qilindingiz tasdiqlandi! ${Number(donation[0].amount).toLocaleString()} so'm 🎉`);

  const updated = await db.select().from(donationsTable).where(eq(donationsTable.id, params.data.id)).limit(1);
  res.json(formatDonation(updated[0]));
});

export default router;
