import { sendMainMenu } from "../menus/mainMenu.js";

export const registerStartCommand = (bot) => {
  bot.onText(/^\/start$/, async (msg) => {
    try {
      const chatId = msg.chat.id;

      await sendMainMenu(bot, chatId);

      console.log("▶️ /start:", {
        chatId,
        telegramId: msg.from?.id,
        username: msg.from?.username,
      });
    } catch (error) {
      console.error("❌ /start error:", error);
    }
  });
};
