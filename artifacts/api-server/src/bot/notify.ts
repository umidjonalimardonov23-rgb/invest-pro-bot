import { Bot } from "grammy";

let botInstance: Bot | null = null;

export function setBot(bot: Bot) {
  botInstance = bot;
}

export async function notifyUser(telegramId: string, message: string) {
  if (!botInstance) return;
  try {
    await botInstance.api.sendMessage(telegramId, message);
  } catch (e) {
    console.error("Failed to notify user", telegramId, e);
  }
}
