import { sendPlayMessage } from "../menus/mainMenu.js";

export const registerPlayNowCommand = (bot) => {
  bot.onText(/^\/playnow$/, async (msg) => {
    try {
      await sendPlayMessage(bot, msg.chat.id);

      console.log("🎮 /playnow:", msg.chat.id);
    } catch (error) {
      console.error("❌ /playnow error:", error);
    }
  });
};
