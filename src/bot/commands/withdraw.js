import { sendWithdrawMessage } from "../menus/mainMenu.js";

export const registerWithdrawCommand = (bot) => {
  bot.onText(/^\/withdraw$/, async (msg) => {
    try {
      await sendWithdrawMessage(bot, msg.chat.id);

      console.log("💸 /withdraw:", msg.chat.id);
    } catch (error) {
      console.error("❌ /withdraw error:", error);
    }
  });
};
