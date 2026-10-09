export const registerSupportCommand = (bot) => {
  bot.onText(/^\/support$/, async (msg) => {
    try {
      const chatId = msg.chat.id;

      await bot.sendMessage(
        chatId,
        `🆘 ድጋፍ

በመለያዎ፣ በተቀማጭ ገንዘብ፣ ገንዘብ በማውጣት ወይም በጨዋታ ላይ ችግር ካጋጠመዎት፣ እባክዎ @enon28 ን ያግኙ።`,
      );

      console.log("🆘 /support:", chatId);
    } catch (error) {
      console.error("❌ /support error:", error);
    }
  });
};
