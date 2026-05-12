import { Bot, InlineKeyboard } from "grammy";
import { db, usersTable, depositsTable, donationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { setBot } from "./notify.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;
const PAYMENT_CARD = "9860606760806673";

// Mini App URL - uses the Replit domain
const MINI_APP_URL = process.env.MINI_APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}`;

export function startBot() {
  if (!BOT_TOKEN) {
    console.warn("BOT_TOKEN not set, bot will not start");
    return;
  }

  const bot = new Bot(BOT_TOKEN);
  setBot(bot);

  // Set menu button (small blue button on bottom-left of chat)
  bot.api.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: "💎 Invest Pro",
      web_app: { url: MINI_APP_URL },
    },
  } as any).catch(() => {});

  bot.command("start", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const username = ctx.from?.username ?? null;
    const firstName = ctx.from?.first_name ?? "Do'st";

    // Create or update user
    const existing = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
    if (!existing[0]) {
      await db.insert(usersTable).values({ telegramId, username, firstName });
    }

    await ctx.reply(
      `🚀 Xush kelibsiz, ${firstName}!\n\n` +
      `💎 Invest Pro — professional investitsiya va o'yin platformasi\n\n` +
      `📈 Har kuni 1.5-3.5% foyda oling\n` +
      `🎮 10 ta 3D o'yin bilan pul ishlang\n` +
      `⚽ Real Madrid vs Barcelona danat qiling`,
      {
        reply_markup: {
          keyboard: [
            [{ text: "🎮 Mini Appni ochish", web_app: { url: MINI_APP_URL } }],
            [{ text: "💰 Hisob to'ldirish" }, { text: "📊 Mening hisobim" }],
            [{ text: "📞 Admin bilan bog'lanish" }],
          ],
          resize_keyboard: true,
        },
      }
    );
  });

  bot.hears("📊 Mening hisobim", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const user = await db.select().from(usersTable).where(eq(usersTable.telegramId, telegramId)).limit(1);
    if (!user[0]) {
      return ctx.reply("Avval /start bosing");
    }
    const u = user[0];
    await ctx.reply(
      `👤 @${u.username || "Noma'lum"}\n\n` +
      `🎮 O'yin balansi: ${Number(u.gameBalance).toLocaleString()} so'm\n` +
      `📈 Investitsiya balansi: ${Number(u.investBalance).toLocaleString()} so'm\n` +
      `💎 Jami: ${(Number(u.gameBalance) + Number(u.investBalance)).toLocaleString()} so'm`
    );
  });

  bot.hears("💰 Hisob to'ldirish", async (ctx) => {
    await ctx.reply(
      `💳 To'lov ma'lumotlari\n\n` +
      `Karta raqami: \`${PAYMENT_CARD}\`\n\n` +
      `1️⃣ Mini App orqali summa kiriting\n` +
      `2️⃣ Kartaga pul o'tkazing\n` +
      `3️⃣ Chek rasmini yuboring\n` +
      `4️⃣ Admin tasdiqlaydi — pul tushadi`,
      { parse_mode: "Markdown" }
    );
  });

  bot.hears("📞 Admin bilan bog'lanish", async (ctx) => {
    await ctx.reply("👨‍💼 Admin: @admin\n\nSavollar uchun murojaat qiling.");
  });

  // Handle photo (receipt)
  bot.on("message:photo", async (ctx) => {
    const telegramId = String(ctx.from?.id);
    const caption = ctx.message.caption || "";

    // Check if this is a donation receipt
    const isDonation = caption.toLowerCase().includes("real") || caption.toLowerCase().includes("barsa") || caption.toLowerCase().includes("barcelona") || caption.toLowerCase().includes("danat");

    if (isDonation) {
      const team = (caption.toLowerCase().includes("real")) ? "Real Madrid" : "Barcelona";
      // Find pending donation
      const pending = await db.select().from(donationsTable)
        .where(eq(donationsTable.telegramId, telegramId))
        .limit(1);

      if (pending[0] && pending[0].status === "pending") {
        const kb = new InlineKeyboard()
          .text("✅ Tasdiqlash", `confirm_donation_${pending[0].id}`)
          .text("❌ Rad etish", `reject_donation_${pending[0].id}`);

        if (ADMIN_ID) {
          await bot.api.sendPhoto(Number(ADMIN_ID), ctx.message.photo.at(-1)!.file_id, {
            caption: `⚽ Danat cheki!\nUser: ${ctx.from?.full_name} (@${ctx.from?.username})\nID: ${telegramId}\nJamoa: ${team}\nSumma: ${Number(pending[0].amount).toLocaleString()} so'm`,
            reply_markup: kb,
          });
        }
        return ctx.reply("✅ Chek adminga yuborildi. Tez orada tasdiqlanadi!");
      }
    }

    // Regular deposit receipt
    const pendingDeposit = await db.select().from(depositsTable)
      .where(eq(depositsTable.telegramId, telegramId))
      .limit(1);

    const depositId = pendingDeposit[0]?.id;
    const depositAmount = pendingDeposit[0] ? Number(pendingDeposit[0].amount) : 0;
    const balType = pendingDeposit[0]?.balanceType === "game" ? "O'yin" : "Investitsiya";

    const kb = new InlineKeyboard()
      .text(`✅ ${depositAmount.toLocaleString()} so'm - ${balType}`, `confirm_dep_${depositId}_${depositAmount}`)
      .row()
      .text("❌ Rad etish", `reject_dep_${depositId}`);

    if (ADMIN_ID) {
      await bot.api.sendPhoto(Number(ADMIN_ID), ctx.message.photo.at(-1)!.file_id, {
        caption: `💳 To'lov cheki!\nUser: ${ctx.from?.full_name} (@${ctx.from?.username})\nID: ${telegramId}\nSo'ralgan: ${depositAmount.toLocaleString()} so'm\nBalance: ${balType}`,
        reply_markup: kb,
      });
    }
    await ctx.reply("✅ Chek adminga yuborildi! Tez orada ko'rib chiqiladi.");
  });

  // Callback: confirm deposit
  bot.callbackQuery(/^confirm_dep_(\d+)_(\d+)$/, async (ctx) => {
    const [, depositIdStr, amountStr] = ctx.match!;
    const depositId = Number(depositIdStr);
    const amount = Number(amountStr);

    const deposit = await db.select().from(depositsTable).where(eq(depositsTable.id, depositId)).limit(1);
    if (!deposit[0] || deposit[0].status !== "pending") {
      return ctx.answerCallbackQuery("Allaqachon qayta ishlangan");
    }

    await db.update(depositsTable).set({ status: "confirmed", amount: String(amount) }).where(eq(depositsTable.id, depositId));

    const user = await db.select().from(usersTable).where(eq(usersTable.telegramId, deposit[0].telegramId)).limit(1);
    if (user[0]) {
      if (deposit[0].balanceType === "game") {
        await db.update(usersTable).set({ gameBalance: String(Number(user[0].gameBalance) + amount) }).where(eq(usersTable.telegramId, deposit[0].telegramId));
      } else {
        await db.update(usersTable).set({ investBalance: String(Number(user[0].investBalance) + amount) }).where(eq(usersTable.telegramId, deposit[0].telegramId));
      }
    }

    const balLabel = deposit[0].balanceType === "game" ? "O'yin balansi" : "Investitsiya balansi";
    await bot.api.sendMessage(deposit[0].telegramId, `✅ Tabriklaymiz! ${amount.toLocaleString()} so'm ${balLabel}ingizga tushdi! 🎉`);
    await ctx.editMessageCaption({ caption: (ctx.callbackQuery.message?.caption || "") + "\n\n✅ TASDIQLANDI" });
    await ctx.answerCallbackQuery("Tasdiqlandi!");
  });

  // Callback: reject deposit
  bot.callbackQuery(/^reject_dep_(\d+)$/, async (ctx) => {
    const depositId = Number(ctx.match![1]);
    const deposit = await db.select().from(depositsTable).where(eq(depositsTable.id, depositId)).limit(1);
    if (deposit[0]) {
      await db.update(depositsTable).set({ status: "rejected" }).where(eq(depositsTable.id, depositId));
      await bot.api.sendMessage(deposit[0].telegramId, "❌ To'lovingiz rad etildi. Batafsil: @admin");
    }
    await ctx.editMessageCaption({ caption: (ctx.callbackQuery.message?.caption || "") + "\n\n❌ RAD ETILDI" });
    await ctx.answerCallbackQuery("Rad etildi");
  });

  // Callback: confirm donation
  bot.callbackQuery(/^confirm_donation_(\d+)$/, async (ctx) => {
    const donationId = Number(ctx.match![1]);
    const donation = await db.select().from(donationsTable).where(eq(donationsTable.id, donationId)).limit(1);
    if (!donation[0]) return ctx.answerCallbackQuery("Topilmadi");

    await db.update(donationsTable).set({ status: "confirmed" }).where(eq(donationsTable.id, donationId));
    const teamName = donation[0].team === "real_madrid" ? "Real Madrid" : "Barcelona";
    await bot.api.sendMessage(donation[0].telegramId, `✅ ${teamName}ga ${Number(donation[0].amount).toLocaleString()} so'm danat qilindingiz tasdiqlandi! ⚽🎉`);
    await ctx.editMessageCaption({ caption: (ctx.callbackQuery.message?.caption || "") + "\n\n✅ DANAT TASDIQLANDI" });
    await ctx.answerCallbackQuery("Tasdiqlandi!");
  });

  // Callback: reject donation
  bot.callbackQuery(/^reject_donation_(\d+)$/, async (ctx) => {
    const donationId = Number(ctx.match![1]);
    const donation = await db.select().from(donationsTable).where(eq(donationsTable.id, donationId)).limit(1);
    if (donation[0]) {
      await db.update(donationsTable).set({ status: "rejected" as any }).where(eq(donationsTable.id, donationId));
      await bot.api.sendMessage(donation[0].telegramId, "❌ Danat so'rovingiz rad etildi.");
    }
    await ctx.editMessageCaption({ caption: (ctx.callbackQuery.message?.caption || "") + "\n\n❌ DANAT RAD ETILDI" });
    await ctx.answerCallbackQuery("Rad etildi");
  });

  bot.start({ onStart: () => console.log("Telegram bot started!") });

  return bot;
}
