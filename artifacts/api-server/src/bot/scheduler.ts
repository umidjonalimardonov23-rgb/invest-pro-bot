import { db, investmentsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { notifyUser } from "./notify.js";

export async function processInvestmentProfits() {
  const now = new Date();
  const activeInvestments = await db.select().from(investmentsTable).where(eq(investmentsTable.status, "active"));

  for (const inv of activeInvestments) {
    // Check if investment has expired
    if (now >= inv.endsAt) {
      await db.update(investmentsTable).set({ status: "completed" }).where(eq(investmentsTable.id, inv.id));
      await notifyUser(inv.telegramId, `📋 Investitsiyangiz yakunlandi! Jami foyda: ${Number(inv.totalEarned).toLocaleString()} so'm 💰`);
      continue;
    }

    // Check if 24 hours have passed since last profit
    const lastProfit = inv.lastProfitAt ?? inv.startedAt;
    const hoursSinceLastProfit = (now.getTime() - lastProfit.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastProfit >= 24) {
      const dailyProfit = Number(inv.dailyProfit);
      const newTotalEarned = Number(inv.totalEarned) + dailyProfit;

      await db.update(investmentsTable).set({
        totalEarned: String(newTotalEarned),
        lastProfitAt: now,
      }).where(eq(investmentsTable.id, inv.id));

      // Add profit to invest balance
      const user = await db.select().from(usersTable).where(eq(usersTable.telegramId, inv.telegramId)).limit(1);
      if (user[0]) {
        const newBalance = Number(user[0].investBalance) + dailyProfit;
        await db.update(usersTable).set({ investBalance: String(newBalance) }).where(eq(usersTable.telegramId, inv.telegramId));
      }

      await notifyUser(inv.telegramId, `💸 Kunlik foyda tushdi! +${dailyProfit.toLocaleString()} so'm (${Number(inv.profitRate)}% stavka) 📈`);
    }
  }
}
