import { sendPaymentMethods } from "../menus/depositMenu.js";

export const registerDepositCommand = (bot) => {
  bot.onText(/^\/deposit$/, async (msg) => {
    try {
      await sendPaymentMethods(bot, msg.chat.id);

      console.log("💰 /deposit:", msg.chat.id);
    } catch (error) {
      console.error("❌ /deposit error:", error);
    }
  });
};
