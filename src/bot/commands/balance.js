import { sendBalanceMessage } from "../menus/mainMenu.js";

export const registerBalanceCommand = (bot) => {
  bot.onText(/^\/balance$/, async (msg) => {
    try {
      await sendBalanceMessage(bot, msg.chat.id);

      console.log("💰 /balance:", {
        chatId: msg.chat.id,
        telegramId: msg.from?.id,
      });
    } catch (error) {
      console.error("❌ /balance error:", error);

      try {
        await bot.sendMessage(
          msg.chat.id,
          "❌ በአሁኑ ወቅት ቀሪ ሂሳብዎን ማረጋገጥ አልተቻለም።",
        );
      } catch (sendError) {
        console.error("❌ Failed to send balance error:", sendError);
      }
    }
  });
};
