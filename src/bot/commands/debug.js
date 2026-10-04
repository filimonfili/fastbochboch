import { isAdmin } from "../utils/auth.js";

export const registerDebugCommands = (bot) => {
  // ==========================================================
  // /MYID
  // ==========================================================

  bot.onText(/^\/myid$/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id;

      await bot.sendMessage(
        chatId,
        `🆔 Your Telegram ID is:

${telegramId}`,
      );

      console.log("🆔 Telegram ID requested:", {
        telegramId,
        username: msg.from?.username,
      });
    } catch (error) {
      console.error("❌ /myid error:", error);
    }
  });

  // ==========================================================
  // /CHECKADMIN
  // ==========================================================

  bot.onText(/^\/checkadmin$/, async (msg) => {
    try {
      const telegramId = msg.from?.id;
      const matched = isAdmin(telegramId);

      console.log("================================");
      console.log("🔍 ADMIN DEBUG");
      console.log("Telegram ID:", telegramId);
      console.log("Configured Admin ID:", process.env.ADMIN_TELEGRAM_ID);
      console.log("Is Admin:", matched);
      console.log("================================");

      await bot.sendMessage(
        msg.chat.id,
        `🔍 Admin Debug

Your Telegram ID:

${telegramId}

Configured Admin ID:

${process.env.ADMIN_TELEGRAM_ID}

Is Admin:

${matched ? "YES ✅" : "NO ❌"}`,
      );
    } catch (error) {
      console.error("❌ /checkadmin error:", error);
    }
  });
};
