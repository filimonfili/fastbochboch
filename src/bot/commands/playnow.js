import { sendPlayMessage } from "../menus/mainMenu.js";

console.log("🎮 playnow.js loaded");

export const registerPlayNowCommand = (bot) => {
  console.log("🎮 Registering /playnow command");

  bot.onText(/^\/playnow$/, async (msg) => {
    console.log("🎮 /playnow COMMAND RECEIVED", {
      chatId: msg.chat?.id,
      telegramId: msg.from?.id,
      text: msg.text,
    });

    try {
      await sendPlayMessage(bot, msg.chat.id);

      console.log("🎮 /playnow message sent");
    } catch (error) {
      console.error("❌ /playnow error:", error);
    }
  });
};
