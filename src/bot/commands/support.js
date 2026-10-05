export const registerSupportCommand = (bot) => {
  bot.onText(/^\/support$/, async (msg) => {
    try {
      const chatId = msg.chat.id;

      await bot.sendMessage(
        chatId,
        `🆘 Support

If you have a problem with your account, deposit, withdrawal, or game, please contact @enon28.`,
      );

      console.log("🆘 /support:", chatId);
    } catch (error) {
      console.error("❌ /support error:", error);
    }
  });
};
