import { sendPlayMessage } from "../menus/mainMenu.js";

export const registerPlayNowCommand = (bot) => {
  bot.onText(/^\/playnow$/, async (msg) => {
    try {
      await sendPlayMessage(bot, msg.chat.id);

      console.log("🎮 /playnow:", {
        chatId: msg.chat.id,
        telegramId: msg.from?.id,
      });
    } catch (error) {
      console.error("❌ /playnow error:", error);
    }
  });
};
