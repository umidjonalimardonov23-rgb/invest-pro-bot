import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateOrGetUserBody } from "@workspace/api-zod";

const router = Router();

router.get("/users/:telegramId", async (req, res) => {
  const user = await db.select().from(usersTable).where(eq(usersTable.telegramId, req.params.telegramId)).limit(1);
  if (!user[0]) return res.status(404).json({ error: "User not found" });
  const u = user[0];
  res.json({
    id: u.id,
    telegramId: u.telegramId,
    username: u.username,
    firstName: u.firstName,
    gameBalance: Number(u.gameBalance),
    investBalance: Number(u.investBalance),
    createdAt: u.createdAt,
  });
});

router.post("/users", async (req, res) => {
  const parsed = CreateOrGetUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { telegramId, username, firstName } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
  if (existing[0]) {
    // Update username/firstName if changed
    await db.update(usersTable).set({ username: username ?? existing[0].username, firstName: firstName ?? existing[0].firstName }).where(eq(usersTable.telegramId, telegramId));
    const updated = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
    const u = updated[0];
    return res.json({ id: u.id, telegramId: u.telegramId, username: u.username, firstName: u.firstName, gameBalance: Number(u.gameBalance), investBalance: Number(u.investBalance), createdAt: u.createdAt });
  }

  const inserted = await db.insert(usersTable).values({ telegramId, username: username ?? null, firstName: firstName ?? null }).returning();
  const u = inserted[0];
  res.json({ id: u.id, telegramId: u.telegramId, username: u.username, firstName: u.firstName, gameBalance: Number(u.gameBalance), investBalance: Number(u.investBalance), createdAt: u.createdAt });
});

export default router;
